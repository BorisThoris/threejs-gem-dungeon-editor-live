import * as THREE from 'three';

// Global refs for camera rotation that can be accessed by UI components
class CameraRotationRefs {
  private cameraRotation = {
    y: -Math.PI / 2, // Default forward direction
    x: 0,
  };

  private listeners = new Set<() => void>();

  // Get current camera rotation
  getRotation = () => ({ ...this.cameraRotation });

  // Update camera rotation (called by camera system)
  updateRotation = (rotation: { y: number; x: number }) => {
    this.cameraRotation = { ...rotation };
    this.notifyListeners();
  };

  // Subscribe to rotation changes
  subscribe = (callback: () => void) => {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  };

  // Notify all listeners
  private notifyListeners = () => {
    this.listeners.forEach(callback => callback());
  };

  // Get rotation as THREE.Euler
  getEuler = () => {
    return new THREE.Euler(this.cameraRotation.x, this.cameraRotation.y, 0, 'YXZ');
  };

  // Get forward direction vector
  getForwardVector = () => {
    const euler = this.getEuler();
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyEuler(euler);
    return forward;
  };

  // Get right direction vector
  getRightVector = () => {
    const euler = this.getEuler();
    const right = new THREE.Vector3(1, 0, 0);
    right.applyEuler(euler);
    return right;
  };
}

// Global instance
export const cameraRotationRefs = new CameraRotationRefs();
