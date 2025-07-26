# Kubernetes Deployment Guide

## 🚀 Quick Start

Deploy your Instagram Caption Generator to Kubernetes in 3 steps:

```bash
# 1. Run the deployment script
./deploy.sh

# 2. Enter your OpenAI API key when prompted

# 3. Access your app via the provided URL
```

## 📋 Prerequisites

- **Kubernetes cluster** (local or cloud)
- **kubectl** configured to connect to your cluster
- **Docker** for building the image
- **OpenAI API key**

## 🔧 Deployment Options

### Option 1: Automated Deployment (Recommended)

```bash
# Deploy with interactive setup
./deploy.sh

# Or set API key via environment variable
export OPENAI_API_KEY="your-api-key-here"
./deploy.sh
```

### Option 2: Manual Deployment

1. **Build the Docker image:**
   ```bash
   docker build -t caption-generator:latest .
   ```

2. **Create the secret with your API key:**
   ```bash
   # Encode your API key
   echo -n "your-api-key-here" | base64
   
   # Edit k8s/secret.yaml and add the encoded key
   # Then apply:
   kubectl apply -f k8s/secret.yaml
   ```

3. **Deploy the application:**
   ```bash
   kubectl apply -f k8s/deployment.yaml
   kubectl apply -f k8s/service.yaml
   ```

## 🎛️ Configuration Options

### Environment Variables

The deployment supports these environment variables:

- `OPENAI_API_KEY`: Your OpenAI API key (required)
- `PORT`: Application port (default: 3000)
- `NODE_ENV`: Environment (default: production)

### Resource Limits

Current resource configuration:
- **Requests**: 128Mi memory, 100m CPU
- **Limits**: 512Mi memory, 500m CPU

To adjust resources, edit `k8s/deployment.yaml`:

```yaml
resources:
  requests:
    memory: "256Mi"  # Increase memory request
    cpu: "200m"      # Increase CPU request
  limits:
    memory: "1Gi"    # Increase memory limit
    cpu: "1000m"     # Increase CPU limit
```

### Scaling

Scale your deployment:

```bash
# Scale to 3 replicas
kubectl scale deployment caption-generator --replicas=3

# Auto-scale based on CPU usage
kubectl autoscale deployment caption-generator --min=2 --max=10 --cpu-percent=70
```

## 🌐 Access Configuration

### Ingress Setup

Edit `k8s/service.yaml` to configure your domain:

```yaml
rules:
- host: caption-generator.yourdomain.com  # Your domain
  http:
    paths:
    - path: /
      pathType: Prefix
      backend:
        service:
          name: caption-generator-service
          port:
            number: 80
```

### SSL/TLS Setup

Uncomment and configure the TLS section in `k8s/service.yaml`:

```yaml
tls:
- hosts:
  - caption-generator.yourdomain.com
  secretName: caption-generator-tls
```

### Local Access (Development)

For local development/testing:

```bash
# Port forward to access locally
kubectl port-forward svc/caption-generator-service 3000:80

# Access at http://localhost:3000
```

## 🔍 Monitoring & Troubleshooting

### Check Application Status

```bash
# Overall status
./deploy.sh status

# Pod status
kubectl get pods -l app=caption-generator

# Service status
kubectl get svc caption-generator-service

# Ingress status
kubectl get ingress caption-generator-ingress
```

### View Logs

```bash
# Follow logs
./deploy.sh logs

# Or manually
kubectl logs -l app=caption-generator -f

# Logs from specific pod
kubectl logs <pod-name>
```

### Health Checks

The application includes health checks:
- **Liveness probe**: `/api/health` endpoint
- **Readiness probe**: Same endpoint with faster checks
- **Docker health check**: Built into the container

### Common Issues

**Pod not starting:**
```bash
# Check pod events
kubectl describe pod <pod-name>

# Check logs
kubectl logs <pod-name>
```

**API key issues:**
```bash
# Verify secret exists
kubectl get secret caption-generator-secrets -o yaml

# Check if secret is mounted correctly
kubectl exec <pod-name> -- env | grep OPENAI
```

**Image pull issues:**
```bash
# If using a private registry, create image pull secret
kubectl create secret docker-registry regcred \
  --docker-server=<your-registry> \
  --docker-username=<username> \
  --docker-password=<password>

# Add to deployment.yaml:
# imagePullSecrets:
# - name: regcred
```

## 🗑️ Cleanup

Remove the application:

```bash
# Using script
./deploy.sh delete

# Or manually
kubectl delete -f k8s/
```

## 🔐 Security Best Practices

The deployment includes several security measures:

- **Non-root user**: Runs as user ID 1001
- **Read-only root filesystem**: Prevents runtime modifications
- **Dropped capabilities**: Removes unnecessary Linux capabilities
- **Resource limits**: Prevents resource exhaustion
- **Secret management**: API key stored as Kubernetes secret

## 📊 Production Considerations

For production deployments:

1. **Use a private container registry**
2. **Configure resource monitoring** (Prometheus/Grafana)
3. **Set up log aggregation** (ELK stack)
4. **Configure backup strategy** for persistent data
5. **Implement proper CI/CD pipeline**
6. **Use namespace isolation**
7. **Configure network policies**
8. **Regular security updates**

## 🆘 Support

If you encounter issues:

1. Check the logs: `./deploy.sh logs`
2. Verify cluster connectivity: `kubectl cluster-info`
3. Check resource availability: `kubectl top nodes`
4. Review pod events: `kubectl describe pods -l app=caption-generator`