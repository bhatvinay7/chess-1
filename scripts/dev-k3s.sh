#!/usr/bin/env bash
set -e

COMMAND=$1
SERVICE=$2

case "$COMMAND" in
  start)
    echo "Starting K3s Kubernetes in Docker..."
    docker compose -f docker-compose.k8s.yml up -d
    echo "Waiting for Kubeconfig generation..."
    until [ -f ./.kube/kubeconfig.yaml ]; do
      sleep 1
    done
    export KUBECONFIG=./.kube/kubeconfig.yaml
    echo "K3s is up and ready! Kubeconfig saved at ./.kube/kubeconfig.yaml"
    ;;

  build)
    if [ -z "$SERVICE" ]; then
      echo "Usage: ./scripts/dev-k3s.sh build <service-name|all>"
      echo "Example: ./scripts/dev-k3s.sh build http-server"
      echo "Example: ./scripts/dev-k3s.sh build all"
      exit 1
    fi
    if [ "$SERVICE" = "all" ]; then
      SERVICES="http-server ws-server game-server sync-worker notification-worker matchmaker cdc web"
    else
      SERVICES="$SERVICE"
    fi
    CONTAINER_ID=$(docker compose -f docker-compose.k8s.yml ps -q server)
    for svc in $SERVICES; do
      IMAGE_NAME="chess-${svc}:dev"
      echo "Building Docker image ${IMAGE_NAME}..."
      docker build -t "$IMAGE_NAME" -f "apps/${svc}/Dockerfile" .
      echo "Importing ${IMAGE_NAME} into K3s container runtime..."
      docker save "$IMAGE_NAME" | docker exec -i "$CONTAINER_ID" k3s ctr images import -
      echo "Image ${IMAGE_NAME} successfully loaded into local K3s!"
    done
    ;;

  deploy)
    export KUBECONFIG=./.kube/kubeconfig.yaml
    echo "Deploying local dev Kubernetes setup (k8s/dev) to K3s..."
    kubectl apply -k k8s/dev
    echo "Deployment submitted! Check pods with: ./scripts/dev-k3s.sh status"
    ;;

  status)
    export KUBECONFIG=./.kube/kubeconfig.yaml
    echo "=== Pod Status ==="
    kubectl get pods -o wide
    echo ""
    echo "=== Service NodePorts ==="
    kubectl get svc -o wide
    ;;

  port-forward)
    export KUBECONFIG=./.kube/kubeconfig.yaml
    echo "Starting port-forwarding from localhost to Kubernetes services..."
    echo "  -> Web App:       http://localhost:3000"
    echo "  -> HTTP Server:   http://localhost:3002"
    echo "  -> WS Server:     ws://localhost:8080"
    echo "  -> Game Server:   localhost:50051"
    kubectl port-forward svc/web 3000:3000 &
    kubectl port-forward svc/http-server 3002:3002 &
    kubectl port-forward svc/ws-server 8080:8080 &
    kubectl port-forward svc/game-server 50051:50051 &
    echo "Press Ctrl+C to stop port-forwarding."
    wait
    ;;

  stop)
    echo "Stopping K3s Kubernetes in Docker..."
    docker compose -f docker-compose.k8s.yml down
    ;;

  *)
    echo "Usage: ./scripts/dev-k3s.sh {start|build <service>|deploy|status|port-forward|stop}"
    echo ""
    echo "Commands:"
    echo "  start           Start local K3s Kubernetes cluster in Docker"
    echo "  build <service> Build Docker image locally and import into K3s"
    echo "  deploy          Apply Kustomize manifests from k8s/dev"
    echo "  status          Show Pods and Service NodePorts in K3s"
    echo "  port-forward    Forward localhost ports (3000, 3002, 8080, 50051) directly to K3s pods"
    echo "  stop            Stop K3s cluster"
    exit 1
    ;;
esac
