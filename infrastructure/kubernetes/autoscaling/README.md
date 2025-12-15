# Auto-Scaling Configuration

## Overview

Complete auto-scaling setup for the Dollor.ai platform with multiple scaling mechanisms.

```
                    ┌─────────────────────────────────────────────────┐
                    │              AUTO-SCALING LAYERS                 │
                    ├─────────────────────────────────────────────────┤
                    │                                                  │
                    │  ┌─────────────┐     ┌─────────────────────┐    │
                    │  │   CLUSTER   │     │  NODE AUTO-SCALER   │    │
                    │  │   LEVEL     │────▶│  (AWS ASG)          │    │
                    │  └─────────────┘     │  Scales: EC2 Nodes  │    │
                    │                      └─────────────────────┘    │
                    │                               │                  │
                    │  ┌─────────────┐              ▼                  │
                    │  │    POD      │     ┌─────────────────────┐    │
                    │  │   LEVEL     │────▶│  HPA (Horizontal)   │    │
                    │  │             │     │  Scales: Pod Count  │    │
                    │  │             │     │  Metrics: CPU/Mem/  │    │
                    │  │             │     │          Custom     │    │
                    │  └─────────────┘     └─────────────────────┘    │
                    │                               │                  │
                    │  ┌─────────────┐              ▼                  │
                    │  │  RESOURCE   │     ┌─────────────────────┐    │
                    │  │   LEVEL     │────▶│  VPA (Vertical)     │    │
                    │  │             │     │  Scales: CPU/Mem    │    │
                    │  │             │     │          Requests   │    │
                    │  └─────────────┘     └─────────────────────┘    │
                    │                               │                  │
                    │  ┌─────────────┐              ▼                  │
                    │  │   EVENT     │     ┌─────────────────────┐    │
                    │  │   DRIVEN    │────▶│  KEDA               │    │
                    │  │             │     │  Scales: Based on   │    │
                    │  │             │     │  external events    │    │
                    │  └─────────────┘     └─────────────────────┘    │
                    │                                                  │
                    └─────────────────────────────────────────────────┘
```

---

## Scaling Components

### 1. Cluster Autoscaler (Node Level)
**File:** `cluster-autoscaler.yaml`

Automatically scales EC2 nodes in AWS EKS based on pending pods.

| Setting | Value |
|---------|-------|
| Scale Down Delay | 10 minutes |
| Scale Down Utilization | 50% |
| Max Provision Time | 15 minutes |

### 2. Horizontal Pod Autoscaler (HPA)
**File:** `hpa-enhanced.yaml`

Scales pod replicas based on resource utilization.

| Environment | Min | Max | CPU Target | Memory Target | Custom Metrics |
|-------------|-----|-----|------------|---------------|----------------|
| Dev | 1 | 3 | 80% | - | No |
| Staging | 2 | 10 | 70% | 80% | Request rate |
| Production | 3 | 50 | 60% | 70% | Request rate, Latency |

### 3. Vertical Pod Autoscaler (VPA)
**File:** `vpa.yaml`

Adjusts CPU/Memory requests based on actual usage.

| Environment | Mode | Min CPU | Max CPU | Min Memory | Max Memory |
|-------------|------|---------|---------|------------|------------|
| Dev | Off | 50m | 2000m | 128Mi | 4Gi |
| Staging | Off | 100m | 2000m | 256Mi | 4Gi |
| Production | Off | 250m | 4000m | 512Mi | 8Gi |

> **Note:** VPA is set to "Off" mode (recommendations only). Review VPA recommendations before enabling auto-apply.

### 4. KEDA (Event-Driven)
**File:** `keda-scaledobject.yaml`

Advanced scaling based on external metrics.

**Triggers:**
- HTTP request rate (Prometheus)
- Request latency P95 (Prometheus)
- Error rate (Prometheus)
- CPU utilization
- Memory utilization

---

## Environment Configuration

### Development
```yaml
HPA:
  minReplicas: 1
  maxReplicas: 3
  targetCPU: 80%

VPA: Recommendations only
KEDA: Disabled
```

### Staging
```yaml
HPA:
  minReplicas: 2
  maxReplicas: 10
  targetCPU: 70%
  targetMemory: 80%
  customMetrics: http_requests_per_second

VPA: Recommendations only
KEDA: Enabled (basic triggers)
```

### Production
```yaml
HPA:
  minReplicas: 3
  maxReplicas: 50
  targetCPU: 60%
  targetMemory: 70%
  customMetrics:
    - http_requests_per_second (threshold: 50)
    - http_request_duration_seconds_p99 (threshold: 200ms)

VPA: Recommendations only (NEVER auto-apply in production)
KEDA: Enabled (full triggers)

Cluster Autoscaler:
  nodeGroups: Auto-discovered via ASG tags
  scaleDownUtilization: 50%
```

---

## Scaling Behavior

### Scale Up (Aggressive)
```yaml
stabilizationWindowSeconds: 0  # No wait
policies:
  - type: Percent
    value: 200  # Double capacity
    periodSeconds: 15
  - type: Pods
    value: 10  # Add up to 10 pods
    periodSeconds: 15
selectPolicy: Max  # Use whichever adds more pods
```

### Scale Down (Conservative)
```yaml
stabilizationWindowSeconds: 600  # Wait 10 minutes
policies:
  - type: Percent
    value: 10  # Remove 10%
    periodSeconds: 120
  - type: Pods
    value: 1  # Remove 1 pod
    periodSeconds: 120
selectPolicy: Min  # Use whichever removes fewer pods
```

---

## Installation

### Prerequisites
```bash
# Install metrics-server (required for HPA)
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Install VPA
kubectl apply -f https://github.com/kubernetes/autoscaler/releases/download/vertical-pod-autoscaler-0.14.0/vpa-v0.14.0.yaml

# Install KEDA
kubectl apply -f https://github.com/kedacore/keda/releases/download/v2.12.0/keda-2.12.0.yaml
```

### Deploy Autoscaling
```bash
# Apply all autoscaling configurations
kubectl apply -f infrastructure/kubernetes/autoscaling/

# Verify
kubectl get hpa -A
kubectl get vpa -A
kubectl get scaledobjects -A
```

---

## Monitoring

### Check HPA Status
```bash
kubectl get hpa -n production
kubectl describe hpa dollor-backend-hpa -n production
```

### Check VPA Recommendations
```bash
kubectl describe vpa dollor-backend-vpa -n production
```

### Check KEDA Status
```bash
kubectl get scaledobjects -n production
kubectl describe scaledobject dollor-backend-scaledobject -n production
```

### Check Cluster Autoscaler
```bash
kubectl logs -f deployment/cluster-autoscaler -n kube-system
```

---

## Metrics for Scaling

| Metric | Source | Used By |
|--------|--------|---------|
| `cpu` | metrics-server | HPA, VPA |
| `memory` | metrics-server | HPA, VPA |
| `http_requests_total` | Prometheus | HPA (via adapter), KEDA |
| `http_request_duration_seconds` | Prometheus | HPA (via adapter), KEDA |
| `http_error_rate` | Prometheus | KEDA |
| `container_cpu_usage_seconds_total` | cAdvisor | VPA |
| `container_memory_usage_bytes` | cAdvisor | VPA |

---

## Troubleshooting

### HPA not scaling
```bash
# Check if metrics are available
kubectl top pods -n production

# Check HPA events
kubectl describe hpa dollor-backend-hpa -n production

# Check custom metrics
kubectl get --raw "/apis/custom.metrics.k8s.io/v1beta1" | jq .
```

### VPA not recommending
```bash
# Check VPA status
kubectl describe vpa dollor-backend-vpa -n production

# Check VPA recommender logs
kubectl logs -f deployment/vpa-recommender -n kube-system
```

### KEDA not triggering
```bash
# Check ScaledObject status
kubectl describe scaledobject dollor-backend-scaledobject -n production

# Check KEDA operator logs
kubectl logs -f deployment/keda-operator -n keda
```
