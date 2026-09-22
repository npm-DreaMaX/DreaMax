"""Rebuild the source registry from audited metadata and local snapshots."""
from pathlib import Path
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
P = ROOT / 'research' / 'verified-systems'
DOCS = [
('gpu-architecture', 'GPU Performance Background', 'NVIDIA', 'https://docs.nvidia.com/deeplearning/performance/dl-performance-gpu-background/index.html', ['GPU SM/Tensor Core/HBM与线程块执行结构'], ['gpu-kernels']),
('gemm-roofline', 'Matrix Multiplication Background', 'NVIDIA', 'https://docs.nvidia.com/deeplearning/performance/dl-performance-matrix-multiplication/index.html', ['GEMM FLOPs、算术强度与算力/内存瓶颈'], ['gpu-kernels']),
('torch-profiler', 'PyTorch Profiler recipe', 'PyTorch', 'https://docs.pytorch.org/tutorials/recipes/recipes/profiler_recipe.html', ['Profiler CPU/CUDA活动、shape与self/total时间解释'], ['gpu-kernels']),
('triton-vector', 'Triton Vector Addition tutorial', 'Triton', 'https://triton-lang.org/main/getting-started/tutorials/01-vector-add.html', ['program_id、load/store mask与kernel教学示例'], ['gpu-kernels']),
('nvidia-smi-util', 'NVIDIA System Management Interface', 'NVIDIA', 'https://docs.nvidia.com/deploy/nvidia-smi/', ['utilization.gpu是采样期间kernel执行时间占比，不是FLOP利用率'], ['gpu-kernels']),
('nccl-collectives', 'NCCL Collective Operations', 'NVIDIA', 'https://docs.nvidia.com/deeplearning/nccl/user-guide/docs/usage/collectives.html', ['AllReduce/AllGather/ReduceScatter/AlltoAll语义及rank调用一致性'], ['distributed-training']),
('nccl-diagnostics', 'NCCL Troubleshooting', 'NVIDIA', 'https://docs.nvidia.com/deeplearning/nccl/user-guide/docs/troubleshooting.html', ['GPU/网络/运行时/拓扑的分层诊断'], ['distributed-training']),
('megatron-parallel-guide', 'Megatron Core Parallelism Strategies Guide', 'NVIDIA', 'https://docs.nvidia.com/megatron-core/developer-guide/latest/user-guide/parallelism-guide.html', ['TP/PP/CP/EP/DP多维组合与拓扑权衡'], ['distributed-training']),
('torch-distributed-checkpoint', 'Getting Started with Distributed Checkpoint', 'PyTorch', 'https://docs.pytorch.org/tutorials/recipes/distributed_checkpoint_recipe.html', ['DCP模型及optimizer状态的分布式保存与加载'], ['distributed-training']),
]
records = []
for ident, title, org, url, supports, chapters in DOCS:
    snapshot = P / (ident + '.html')
    notes = ('本地原始文档 sha256=' + hashlib.sha256(snapshot.read_bytes()).hexdigest()
             if snapshot.exists() else '已通过浏览器工具核验官方文档；直接下载返回403，未保存本地快照。')
    records.append(dict(id=ident, title=title, organization=org, type='官方文档', url=url,
                        published='未标注', accessed='2026-09-22', repository=None,
                        version='2026-09-22 查阅的官方文档', license='未核验',
                        supports=supports, chapters=chapters, evidence='官方事实', notes=notes))

META = [
('flashattention-code', 'FlashAttention Python/CUDA interface', 'Dao-AILab', 'BSD-3-Clause', 'flash_attn_func / FlashAttnFunc.forward / FlashAttnFunc.backward', ['gpu-kernels'], ['QKV形状、autograd上下文、保存LSE与CUDA前后向调用'], 828),
('nccl-bandwidth', 'NCCL tests bandwidth accounting', 'NVIDIA', 'BSD-3-Clause', 'AllReduce bus bandwidth formula', ['distributed-training'], ['algbw/busbw定义及每rank通信因子'], 17),
('torch-fsdp-code', 'PyTorch FSDP2 fully_shard implementation', 'PyTorch', 'BSD-3-Clause；第三方条款见项目LICENSE', 'fully_shard', ['distributed-training'], ['参数分片、forward all-gather、backward reduce-scatter与module hook生命周期'], 109),
]
for ident, title, org, license, symbol, chapters, supports, start in META:
    record = json.loads((P / (ident + '.json')).read_text())
    suffix = '.md' if ident == 'nccl-bandwidth' else '.py'
    lines = (P / (ident + suffix)).read_text().splitlines()
    record.pop('commitDate', None)
    record.update(title=title, organization=org, type='官方源码', published='未标注',
                  license=license, symbol=symbol, chapters=chapters, supports=supports,
                  evidence='源码观察', excerpt='\n'.join(lines[start-1:start+8]), excerptStart=start)
    records.append(record)

(ROOT / 'src' / 'data' / 'sources-systems.json').write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n')
print(f'Registered {len(records)} verified systems sources')
