(() => {
  const physics = window.PHYSICS;
  const content = window.PAGE_CONTENT;
  const svg = document.querySelector("#trajectory");
  const startButton = document.querySelector("#start");
  const pauseButton = document.querySelector("#pause");
  const resetButton = document.querySelector("#reset");
  const svgNamespace = "http://www.w3.org/2000/svg";
  const chart = { width: 760, height: 390, left: 62, right: 24, top: 24, bottom: 52 };
  const chartPlotHeight = chart.height - chart.top - chart.bottom;
  const velocityVectorScale = 0.24;
  let animationFrame = 0;
  let activeBall;
  let velocityVector;
  let velocityXVector;
  let velocityYVector;
  let activeSimulation;
  let animationStartedAt = 0;
  let elapsedMilliseconds = 0;
  let isAnimating = false;

  document.querySelectorAll("[data-copy]").forEach((element) => {
    const key = element.dataset.copy;
    element.textContent = content[key];
  });
  document.querySelectorAll("[data-copy-html]").forEach((element) => {
    const key = element.dataset.copyHtml;
    element.innerHTML = content[key];
  });

  const inputs = {
    speed: document.querySelector("#speed"),
    angle: document.querySelector("#angle"),
    startHeight: document.querySelector("#start-height")
  };
  const values = {
    speed: document.querySelector("#speed-value"),
    angle: document.querySelector("#angle-value"),
    startHeight: document.querySelector("#start-height-value")
  };
  const currentTime = document.querySelector("#current-time");
  const positionX = document.querySelector("#position-x");
  const positionY = document.querySelector("#position-y");
  const velocityX = document.querySelector("#velocity-x");
  const velocityY = document.querySelector("#velocity-y");
  const flightTimeOutput = document.querySelector("#flight-time");
  const rangeOutput = document.querySelector("#range");
  const heightOutput = document.querySelector("#height");
  const gravityOutput = document.querySelector("#gravity-value");

  Object.entries(inputs).forEach(([name, input]) => {
    const control = physics.controls[name];
    input.min = control.min;
    input.max = control.max;
    input.step = control.step;
    input.value = physics.defaults[name];
  });

  const numberFormat = new Intl.NumberFormat("sv-SE", {
    maximumFractionDigits: 2
  });

  function makeSvgElement(name, attributes = {}) {
    const element = document.createElementNS(svgNamespace, name);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
    return element;
  }

  function addText(parent, x, y, text, className, anchor = "middle") {
    const element = makeSvgElement("text", {
      x,
      y,
      "text-anchor": anchor,
      class: className
    });
    element.textContent = text;
    parent.append(element);
    return element;
  }

  function addAxisLabel(parent, x, y, symbol) {
    const label = makeSvgElement("text", {
      x,
      y,
      "text-anchor": "middle",
      class: "axis-label"
    });
    const quantity = makeSvgElement("tspan", { class: "axis-quantity" });
    const unit = makeSvgElement("tspan");
    quantity.textContent = symbol;
    unit.textContent = " (m)";
    label.append(quantity, unit);
    parent.append(label);
    return label;
  }

  function makeArrowMarker(id, arrowheadClass) {
    const marker = makeSvgElement("marker", {
      id,
      viewBox: "0 0 10 10",
      refX: 9,
      refY: 5,
      markerWidth: 7,
      markerHeight: 7,
      markerUnits: "userSpaceOnUse",
      orient: "auto"
    });
    marker.append(makeSvgElement("path", {
      d: "M 0 0 L 10 5 L 0 10 z",
      class: arrowheadClass
    }));
    return marker;
  }

  function format(value) {
    return numberFormat.format(value);
  }

  function getValues() {
    return {
      speed: Number(inputs.speed.value),
      angle: Number(inputs.angle.value),
      startHeight: Number(inputs.startHeight.value)
    };
  }

  function getIntegerTicks(maximum) {
    const targetStep = maximum / 4;
    const magnitude = 10 ** Math.floor(Math.log10(Math.max(targetStep, 1e-10)));
    const normalizedStep = targetStep / magnitude;
    const stepFactor = normalizedStep <= 1.5 ? 1
      : normalizedStep <= 3.5 ? 2
        : normalizedStep <= 7.5 ? 5
          : 10;
    const step = Math.max(1, stepFactor * magnitude);
    const ticks = [];

    for (let value = 0; value <= maximum; value += step) {
      ticks.push(value);
    }

    return ticks;
  }

  function renderChart(parameters, result) {
    svg.replaceChildren();
    const description = makeSvgElement("desc", { id: "chart-description" });
    description.textContent =
      `Kaströrelse med starthastigheten ${format(parameters.speed)} meter per sekund ` +
      `och vinkeln ${format(parameters.angle)} grader. Starthöjden är ` +
      `${format(parameters.startHeight)} meter och bollen landar på marknivån. ` +
      `Räckvidden är ${format(result.range)} meter. ` +
      "Axelpilarna visar positiva riktningar: x åt höger och y uppåt. " +
      "Den orange pilen visar hastighetsvektorn. Turkos och lila pilar visar dess horisontella " +
      "respektive vertikala komponent.";
    const definitions = makeSvgElement("defs");
    definitions.append(
      makeArrowMarker("axis-arrow", "axis-arrowhead"),
      makeArrowMarker("velocity-arrow", "velocity-arrowhead"),
      makeArrowMarker("velocity-x-arrow", "velocity-x-arrowhead"),
      makeArrowMarker("velocity-y-arrow", "velocity-y-arrowhead")
    );
    svg.append(description, definitions);

    const plotWidth = chart.width - chart.left - chart.right;
    const plotHeight = chartPlotHeight;
    const vectorExtent = parameters.speed * velocityVectorScale;
    const xDisplayMaximum = Math.max(1, Math.ceil(result.range + vectorExtent + 1));
    const yDisplayMaximum = Math.max(1, Math.ceil(result.maxHeight + vectorExtent + 1));
    const scale = Math.min(plotWidth / xDisplayMaximum, plotHeight / yDisplayMaximum);
    const verticalVectorExtent =
      parameters.speed * Math.sin(parameters.angle * Math.PI / 180) * velocityVectorScale * scale;
    chart.bottom = Math.ceil(verticalVectorExtent + 52);
    chart.height = chart.top + plotHeight + chart.bottom;
    svg.setAttribute("viewBox", `0 0 ${chart.width} ${chart.height}`);
    const xAxisMaximum = plotWidth / scale;
    const yAxisMaximum = chartPlotHeight / scale;
    const x = (distance) => chart.left + distance * scale;
    const y = (height) => chart.height - chart.bottom - height * scale;
    const grid = makeSvgElement("g", { class: "grid" });
    const axes = makeSvgElement("g", { class: "axes" });

    getIntegerTicks(xAxisMaximum).forEach((distance) => {
      const xPosition = x(distance);

      grid.append(makeSvgElement("line", {
        x1: xPosition, y1: chart.top, x2: xPosition, y2: chart.height - chart.bottom
      }));
      addText(axes, xPosition, chart.height - 34, format(distance), "tick-label");
    });

    getIntegerTicks(yAxisMaximum).forEach((height) => {
      const yPosition = y(height);
      grid.append(makeSvgElement("line", {
        x1: chart.left, y1: yPosition, x2: chart.width - chart.right, y2: yPosition
      }));
      addText(axes, chart.left - 10, yPosition + 4, format(height), "tick-label", "end");
    });

    axes.append(makeSvgElement("line", {
      x1: chart.left, y1: chart.height - chart.bottom, x2: chart.left, y2: chart.top,
      class: "axis-line",
      "marker-end": "url(#axis-arrow)"
    }));
    axes.append(makeSvgElement("line", {
      x1: chart.left, y1: chart.height - chart.bottom,
      x2: chart.width - chart.right, y2: chart.height - chart.bottom,
      class: "axis-line",
      "marker-end": "url(#axis-arrow)"
    }));
    addAxisLabel(axes, chart.left + plotWidth / 2, chart.height - 8, "x");
    const verticalLabel = addAxisLabel(axes, 16, chart.top + chartPlotHeight / 2, "y");
    verticalLabel.setAttribute("transform", `rotate(-90 16 ${chart.top + chartPlotHeight / 2})`);

    const samples = 100;
    const path = [];
    for (let index = 0; index <= samples; index += 1) {
      const time = result.flightTime * index / samples;
      const position = physics.positionAt(
        time, parameters.speed, parameters.angle, parameters.startHeight
      );
      path.push(`${index === 0 ? "M" : "L"} ${x(position.x)} ${y(Math.max(0, position.y))}`);
    }

    const trajectory = makeSvgElement("path", {
      d: path.join(" "),
      class: "trajectory-line"
    });
    const start = makeSvgElement("circle", {
      cx: x(0), cy: y(parameters.startHeight), r: 5, class: "endpoint"
    });
    const landing = makeSvgElement("circle", {
      cx: x(result.range), cy: y(0), r: 5, class: "endpoint"
    });
    velocityXVector = makeSvgElement("line", {
      class: "velocity-component velocity-component-x",
      "marker-end": "url(#velocity-x-arrow)"
    });
    velocityYVector = makeSvgElement("line", {
      class: "velocity-component velocity-component-y",
      "marker-end": "url(#velocity-y-arrow)"
    });
    velocityVector = makeSvgElement("line", {
      class: "velocity-vector",
      "marker-end": "url(#velocity-arrow)"
    });
    activeBall = makeSvgElement("circle", {
      cx: x(0), cy: y(parameters.startHeight), r: 8, class: "moving-ball"
    });

    svg.append(
      grid, trajectory, axes, start, landing,
      velocityXVector, velocityYVector, velocityVector, activeBall
    );
    return { x, y, scale };
  }

  function update() {
    cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    isAnimating = false;
    elapsedMilliseconds = 0;
    const parameters = getValues();
    const result = physics.calculate(
      parameters.speed, parameters.angle, parameters.startHeight
    );

    values.speed.textContent = `${format(parameters.speed)} m/s`;
    values.angle.textContent = `${format(parameters.angle)}°`;
    values.startHeight.textContent = `${format(parameters.startHeight)} m`;
    gravityOutput.textContent = format(physics.gravity);
    flightTimeOutput.textContent = format(result.flightTime);
    rangeOutput.textContent = format(result.range);
    heightOutput.textContent = format(result.maxHeight);
    inputs.speed.setAttribute("aria-valuetext", values.speed.textContent);
    inputs.angle.setAttribute("aria-valuetext", values.angle.textContent);
    inputs.startHeight.setAttribute("aria-valuetext", values.startHeight.textContent);

    const map = renderChart(parameters, result);
    activeSimulation = { parameters, result, map };
    updatePosition(0);
    updateButtonStates();
  }

  function updatePosition(time) {
    const { parameters, map } = activeSimulation;
    const position = physics.positionAt(
      time, parameters.speed, parameters.angle, parameters.startHeight
    );
    const height = Math.max(0, position.y);
    const originX = map.x(position.x);
    const originY = map.y(height);
    const endX = map.x(position.x + position.vx * velocityVectorScale);
    const endY = map.y(height + position.vy * velocityVectorScale);
    velocityXVector.setAttribute("x1", originX);
    velocityXVector.setAttribute("y1", originY);
    velocityXVector.setAttribute("x2", endX);
    velocityXVector.setAttribute("y2", originY);
    velocityXVector.style.visibility = Math.abs(endX - originX) < 8 ? "hidden" : "visible";
    velocityYVector.setAttribute("x1", endX);
    velocityYVector.setAttribute("y1", originY);
    velocityYVector.setAttribute("x2", endX);
    velocityYVector.setAttribute("y2", endY);
    velocityYVector.style.visibility = Math.abs(endY - originY) < 8 ? "hidden" : "visible";
    velocityVector.setAttribute("x1", originX);
    velocityVector.setAttribute("y1", originY);
    velocityVector.setAttribute("x2", endX);
    velocityVector.setAttribute("y2", endY);
    activeBall.setAttribute("cx", originX);
    activeBall.setAttribute("cy", originY);
    currentTime.textContent = format(time);
    positionX.textContent = format(position.x);
    positionY.textContent = format(height);
    velocityX.textContent = format(position.vx);
    velocityY.textContent = format(position.vy);
  }

  function updateButtonStates() {
    startButton.disabled = isAnimating;
    pauseButton.disabled = !isAnimating;
  }

  function animate(now) {
    const duration = activeSimulation.result.flightTime * 1000;
    elapsedMilliseconds = Math.min(now - animationStartedAt, duration);
    updatePosition(elapsedMilliseconds / 1000);

    if (elapsedMilliseconds < duration) {
      animationFrame = requestAnimationFrame(animate);
      return;
    }

    isAnimating = false;
    animationFrame = 0;
    updateButtonStates();
  }

  function startAnimation() {
    if (isAnimating) {
      return;
    }

    const duration = activeSimulation.result.flightTime * 1000;
    if (elapsedMilliseconds >= duration) {
      elapsedMilliseconds = 0;
      updatePosition(0);
    }

    isAnimating = true;
    animationStartedAt = performance.now() - elapsedMilliseconds;
    updateButtonStates();
    animationFrame = requestAnimationFrame(animate);
  }

  function pauseAnimation() {
    if (!isAnimating) {
      return;
    }

    cancelAnimationFrame(animationFrame);
    elapsedMilliseconds = Math.min(
      performance.now() - animationStartedAt,
      activeSimulation.result.flightTime * 1000
    );
    isAnimating = false;
    animationFrame = 0;
    updatePosition(elapsedMilliseconds / 1000);
    updateButtonStates();
  }

  function resetAnimation() {
    cancelAnimationFrame(animationFrame);
    isAnimating = false;
    animationFrame = 0;
    elapsedMilliseconds = 0;
    updatePosition(0);
    updateButtonStates();
  }

  Object.values(inputs).forEach((input) => input.addEventListener("input", update));
  startButton.addEventListener("click", startAnimation);
  pauseButton.addEventListener("click", pauseAnimation);
  resetButton.addEventListener("click", resetAnimation);
  update();
})();
