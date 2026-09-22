# 从计算图到参数更新

## 要解决的问题

反向传播计算“当前每个参数改变一点，会怎样改变 loss”；梯度下降才用这个结果更新参数。先把两者在代码中分开，才容易理解后面的 DPO 或策略梯度没有绕开反向传播。

本实验前向计算 `z = w0*x0 + w1*x1 + b`、`prediction = tanh(z)`、`loss = 0.5*(prediction-target)^2`。输入 shape 为 `[2]`、权重 `[2]`，其余是标量。初值在 `labs/configs/gradients.json`；每次 `loss_graph` 都生成一个新的 DAG。

```bash
python3 -m labs.run --experiment gradients --output /tmp/gradients.json
python3 -m unittest discover -s tests -p 'test_*.py' -v
```

## 逐项核对

`loss_graph → Value.backward → 每个节点的 _backward` 构成调用链。`Value.backward` 先按依赖拓扑排序，令 `dL/dL=1`，再反向执行局部导数。加法把上游梯度分别传给输入；乘法乘上另一个输入；tanh 乘以 `1-tanh(z)^2`。一个节点被多条下游路径使用时，必须用 `+=`。例如 `u=x*x; L=u+u` 在 x=3 时应得 `dL/dx=12`。

输出 `graph` 的每行包含 `id / parents / operation / value / gradient`，可直接画图。`autodiff_gradients` 的顺序为 `[dw0,dw1,db]`，默认约 `[.027016,-.036021,.018011]`。中心差分逐个独立扰动参数，使用 `(L(w+ε)-L(w-ε))/(2ε)`，不是复用自动微分结果。

默认最大差分误差约 `1.18e-10`。40 次 `parameter -= learning_rate * gradient` 后 loss 从约 `.00079135` 降到 `7.67e-11`。先确认梯度正确，再讨论优化效率；loss 下降本身不证明梯度正确。

## 调试与工程任务

将 `learning_rate` 改为 10，观察 loss 是否震荡或进入 tanh 饱和区。将初始权重设得很大，观察 `z`、tanh 局部导数和参数梯度的关系。将 `+=` 临时改成 `=`，运行 shared-node 测试，说明为什么一张图上的多条路径会丢失贡献。

差分步长不是越小越好；过小会因浮点相消失真，过大会受非线性曲率影响。实验使用 float64 的 Python float、固定 `ε=1e-5`。生产系统需要张量广播、批量归约、混合精度、梯度累积和分布式同步；这些都没有在这里实现。这里的 `backward()` 每次清空本图所有梯度，与 PyTorch 默认对叶子 `.grad` 跨 backward 累积的行为不同。

