// Justera standardvärden och beräkningsmodellen för fysiken här.
window.PHYSICS = {
  gravity: 9.82,
  defaults: {
    speed: 20,
    angle: 45,
    startHeight: 0
  },
  controls: {
    speed: { min: 5, max: 40, step: 1 },
    angle: { min: 5, max: 90, step: 1 },
    startHeight: { min: 0, max: 20, step: 0.1 }
  },
  calculate(speed, angleDegrees, startHeight = this.defaults.startHeight, gravity = this.gravity) {
    const angle = angleDegrees * Math.PI / 180;
    const horizontalSpeed = speed * Math.cos(angle);
    const verticalSpeed = speed * Math.sin(angle);
    const flightTime =
      (verticalSpeed + Math.sqrt(verticalSpeed ** 2 + 2 * gravity * startHeight)) / gravity;
    const range = horizontalSpeed * flightTime;
    const maxHeight = startHeight + verticalSpeed ** 2 / (2 * gravity);

    return { flightTime, range, maxHeight, horizontalSpeed, verticalSpeed };
  },
  positionAt(time, speed, angleDegrees, startHeight = this.defaults.startHeight, gravity = this.gravity) {
    const angle = angleDegrees * Math.PI / 180;
    const horizontalSpeed = speed * Math.cos(angle);
    const verticalSpeed = speed * Math.sin(angle);
    return {
      x: horizontalSpeed * time,
      y: startHeight + verticalSpeed * time - 0.5 * gravity * time ** 2,
      vx: horizontalSpeed,
      vy: verticalSpeed - gravity * time
    };
  }
};
