(() => {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const COLORS = {
    event: "#a6333b",
    nonEvent: "#286a99",
    baseline: "#6a747d",
    ink: "#18212b",
    muted: "#5f6b78",
    grid: "#dbe3eb",
    threshold: "#374151"
  };
  const SCORE_SD = 0.15;
  const THRESHOLD = 0.5;
  const BASELINE = { prevalence: 0.5, separation: 0.5 };

  function svgElement(name, attributes = {}, textContent) {
    const element = document.createElementNS(SVG_NS, name);
    Object.entries(attributes).forEach(([name, value]) => {
      if (value !== undefined && value !== null) {
        element.setAttribute(name, String(value));
      }
    });
    if (textContent !== undefined) {
      element.textContent = textContent;
    }
    return element;
  }

  function append(svg, name, attributes, textContent) {
    const element = svgElement(name, attributes, textContent);
    svg.appendChild(element);
    return element;
  }

  function clearSvg(svg, title, description) {
    svg.replaceChildren();
    svg.setAttribute("viewBox", "0 0 640 330");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.setAttribute("aria-label", description);
    append(svg, "title", {}, title);
    append(svg, "desc", {}, description);
  }

  function formatPercent(value, digits = 1) {
    return `${(value * 100).toFixed(digits)}%`;
  }

  function formatMetric(value) {
    return value >= 0.995 ? "100%" : formatPercent(value, 0);
  }

  function formatAxis(value) {
    if (value === 0 || value === 1) {
      return value.toFixed(0);
    }
    return value.toFixed(1);
  }

  // Abramowitz and Stegun approximation, accurate enough for the simulation plots.
  function errorFunction(value) {
    const sign = value < 0 ? -1 : 1;
    const x = Math.abs(value);
    const t = 1 / (1 + 0.3275911 * x);
    const polynomial =
      (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
        0.254829592) *
        t);
    return sign * (1 - polynomial * Math.exp(-x * x));
  }

  function normalCdf(value) {
    return 0.5 * (1 + errorFunction(value / Math.SQRT2));
  }

  function normalDensity(value, mean) {
    const z = (value - mean) / SCORE_SD;
    return Math.exp(-0.5 * z * z) / (SCORE_SD * Math.sqrt(2 * Math.PI));
  }

  function operatingCharacteristics(prevalence, separation, threshold = THRESHOLD) {
    const positiveMean = THRESHOLD + separation / 2;
    const negativeMean = THRESHOLD - separation / 2;
    const sensitivity = 1 - normalCdf((threshold - positiveMean) / SCORE_SD);
    const specificity = normalCdf((threshold - negativeMean) / SCORE_SD);
    const falsePositiveRate = 1 - specificity;
    const truePositive = prevalence * sensitivity;
    const falseNegative = prevalence * (1 - sensitivity);
    const falsePositive = (1 - prevalence) * falsePositiveRate;
    const trueNegative = (1 - prevalence) * specificity;
    const accuracy = truePositive + trueNegative;
    const ppvDenominator = truePositive + falsePositive;
    const npvDenominator = trueNegative + falseNegative;
    const mccDenominator = Math.sqrt(
      (truePositive + falsePositive) *
        (truePositive + falseNegative) *
        (trueNegative + falsePositive) *
        (trueNegative + falseNegative)
    );

    return {
      sensitivity,
      specificity,
      accuracy,
      ppv: ppvDenominator === 0 ? 0 : truePositive / ppvDenominator,
      npv: npvDenominator === 0 ? 0 : trueNegative / npvDenominator,
      mcc: mccDenominator === 0 ? 0 : (truePositive * trueNegative - falsePositive * falseNegative) / mccDenominator
    };
  }

  function curveData(prevalence, separation) {
    const positiveMean = THRESHOLD + separation / 2;
    const negativeMean = THRESHOLD - separation / 2;
    const points = [{ falsePositiveRate: 0, sensitivity: 0, recall: 0, precision: 1 }];

    for (let index = 0; index <= 180; index += 1) {
      const threshold = 1.25 - (1.5 * index) / 180;
      const sensitivity = 1 - normalCdf((threshold - positiveMean) / SCORE_SD);
      const falsePositiveRate = 1 - normalCdf((threshold - negativeMean) / SCORE_SD);
      const predictedPositive = prevalence * sensitivity + (1 - prevalence) * falsePositiveRate;
      points.push({
        falsePositiveRate,
        sensitivity,
        recall: sensitivity,
        precision: predictedPositive === 0 ? 1 : (prevalence * sensitivity) / predictedPositive
      });
    }

    points.push({ falsePositiveRate: 1, sensitivity: 1, recall: 1, precision: prevalence });
    return points;
  }

  function pathFromPoints(points, scaleX, scaleY, xKey, yKey) {
    return points
      .map((point, index) => `${index === 0 ? "M" : "L"}${scaleX(point[xKey]).toFixed(2)},${scaleY(point[yKey]).toFixed(2)}`)
      .join(" ");
  }

  function addText(svg, x, y, text, options = {}) {
    const renderedWidth = svg.clientWidth || 640;
    const requestedSize = options.size || 12;
    return append(
      svg,
      "text",
      {
        x,
        y,
        fill: options.fill || COLORS.muted,
        "font-size": (requestedSize * 640) / renderedWidth,
        "font-family": "Arial, Helvetica, sans-serif",
        "font-weight": options.weight || 400,
        "text-anchor": options.anchor || "start",
        transform: options.transform || undefined
      },
      text
    );
  }

  function drawLegend(svg, items, x, y) {
    const itemWidth = 116;
    items.forEach((item, index) => {
      const itemX = x + index * itemWidth;
      append(svg, "line", {
        x1: itemX,
        y1: y,
        x2: itemX + 18,
        y2: y,
        stroke: item.color,
        "stroke-width": 3,
        "stroke-linecap": "round",
        "stroke-dasharray": item.dash || undefined
      });
      addText(svg, itemX + 24, y + 4, item.label, { size: 11, fill: COLORS.muted });
    });
  }

  function drawAxes(svg, options) {
    const { left, top, right, bottom, xLabel, yLabel, xTicks, yTicks, xScale, yScale } = options;
    const plotWidth = right - left;
    const plotHeight = bottom - top;

    yTicks.forEach((tick) => {
      const y = yScale(tick);
      append(svg, "line", {
        x1: left,
        y1: y,
        x2: right,
        y2: y,
        stroke: COLORS.grid,
        "stroke-width": 1
      });
      addText(svg, left - 8, y + 4, formatAxis(tick), { anchor: "end", size: 11 });
    });

    xTicks.forEach((tick) => {
      const x = xScale(tick);
      append(svg, "line", {
        x1: x,
        y1: top,
        x2: x,
        y2: bottom,
        stroke: COLORS.grid,
        "stroke-width": 1
      });
      addText(svg, x, bottom + 18, formatAxis(tick), { anchor: "middle", size: 11 });
    });

    append(svg, "line", { x1: left, y1: bottom, x2: right, y2: bottom, stroke: COLORS.ink, "stroke-width": 1.25 });
    append(svg, "line", { x1: left, y1: top, x2: left, y2: bottom, stroke: COLORS.ink, "stroke-width": 1.25 });
    addText(svg, left + plotWidth / 2, bottom + 42, xLabel, { anchor: "middle", size: 12, weight: 700, fill: COLORS.ink });
    addText(svg, 16, top + plotHeight / 2, yLabel, {
      anchor: "middle",
      size: 12,
      weight: 700,
      fill: COLORS.ink,
      transform: `rotate(-90 16 ${top + plotHeight / 2})`
    });
  }

  function drawDistribution(svg, state) {
    const { prevalence, separation } = state;
    const title = "Event score distributions";
    const description = `The selected scenario contains ${formatPercent(prevalence)} events. The event and non-event score distributions are separated by ${separation.toFixed(2)}.`;
    clearSvg(svg, title, description);

    const dimensions = { left: 58, top: 36, right: 618, bottom: 270 };
    const positiveMean = THRESHOLD + separation / 2;
    const negativeMean = THRESHOLD - separation / 2;
    const samples = Array.from({ length: 161 }, (_, index) => index / 160);
    const eventValues = samples.map((score) => prevalence * normalDensity(score, positiveMean));
    const nonEventValues = samples.map((score) => (1 - prevalence) * normalDensity(score, negativeMean));
    const maxValue = Math.max(...eventValues, ...nonEventValues) * 1.12;
    const xScale = (value) => dimensions.left + value * (dimensions.right - dimensions.left);
    const yScale = (value) => dimensions.bottom - (value / maxValue) * (dimensions.bottom - dimensions.top);
    const densityTicks = [0, maxValue / 2, maxValue];

    drawAxes(svg, {
      ...dimensions,
      xLabel: "Predicted probability",
      yLabel: "Relative frequency",
      xTicks: [0, 0.5, 1],
      yTicks: densityTicks,
      xScale,
      yScale
    });

    function drawDensity(values, color) {
      const points = values.map((value, index) => ({ score: samples[index], value }));
      const linePath = pathFromPoints(points, xScale, yScale, "score", "value");
      const areaPath = `${linePath} L${xScale(1).toFixed(2)},${yScale(0).toFixed(2)} L${xScale(0).toFixed(2)},${yScale(0).toFixed(2)} Z`;
      append(svg, "path", { d: areaPath, fill: color, "fill-opacity": 0.16, stroke: "none" });
      append(svg, "path", { d: linePath, fill: "none", stroke: color, "stroke-width": 3, "stroke-linejoin": "round" });
    }

    drawDensity(nonEventValues, COLORS.nonEvent);
    drawDensity(eventValues, COLORS.event);

    const thresholdX = xScale(THRESHOLD);
    append(svg, "line", {
      x1: thresholdX,
      y1: dimensions.top,
      x2: thresholdX,
      y2: dimensions.bottom,
      stroke: COLORS.threshold,
      "stroke-width": 1.5,
      "stroke-dasharray": "5 4"
    });
    addText(svg, thresholdX + 6, dimensions.top + 14, "Threshold", { size: 11, fill: COLORS.threshold });
    drawLegend(svg, [
      { label: "Event", color: COLORS.event },
      { label: "Non-event", color: COLORS.nonEvent }
    ], 366, 21);
  }

  function drawCurveChart(svg, configuration) {
    const { title, description, xLabel, yLabel, currentPoints, baselinePoints, xKey, yKey, diagonal } = configuration;
    clearSvg(svg, title, description);
    const dimensions = { left: 58, top: 36, right: 618, bottom: 270 };
    const xScale = (value) => dimensions.left + value * (dimensions.right - dimensions.left);
    const yScale = (value) => dimensions.bottom - value * (dimensions.bottom - dimensions.top);

    drawAxes(svg, {
      ...dimensions,
      xLabel,
      yLabel,
      xTicks: [0, 0.5, 1],
      yTicks: [0, 0.5, 1],
      xScale,
      yScale
    });

    if (diagonal) {
      append(svg, "line", {
        x1: xScale(0),
        y1: yScale(0),
        x2: xScale(1),
        y2: yScale(1),
        stroke: COLORS.muted,
        "stroke-width": 1.25,
        "stroke-dasharray": "5 4"
      });
    }

    append(svg, "path", {
      d: pathFromPoints(baselinePoints, xScale, yScale, xKey, yKey),
      fill: "none",
      stroke: COLORS.baseline,
      "stroke-width": 2.5,
      "stroke-linejoin": "round",
      "stroke-linecap": "round"
    });
    append(svg, "path", {
      d: pathFromPoints(currentPoints, xScale, yScale, xKey, yKey),
      fill: "none",
      stroke: COLORS.event,
      "stroke-width": 3,
      "stroke-linejoin": "round",
      "stroke-linecap": "round"
    });
    drawLegend(svg, [
      { label: "Selected", color: COLORS.event },
      { label: "Baseline", color: COLORS.baseline }
    ], 372, 21);
  }

  function drawMetrics(svg, state) {
    const currentMetrics = operatingCharacteristics(state.prevalence, state.separation);
    const baselineMetrics = operatingCharacteristics(BASELINE.prevalence, BASELINE.separation);
    const metrics = [
      { label: "Accuracy", shortLabel: "Acc", key: "accuracy" },
      { label: "Sensitivity", shortLabel: "Sens", key: "sensitivity" },
      { label: "Specificity", shortLabel: "Spec", key: "specificity" },
      { label: "PPV", key: "ppv" },
      { label: "NPV", key: "npv" },
      { label: "MCC", key: "mcc" }
    ];
    const description = metrics
      .map((metric) => `${metric.label} ${formatPercent(currentMetrics[metric.key])}`)
      .join(", ");
    clearSvg(svg, "Threshold performance metrics", `Selected scenario: ${description}. Gray bars show the balanced baseline.`);

    const dimensions = { left: 58, top: 36, right: 618, bottom: 258 };
    const xScale = (index) => dimensions.left + ((index + 0.5) / metrics.length) * (dimensions.right - dimensions.left);
    const yScale = (value) => dimensions.bottom - value * (dimensions.bottom - dimensions.top);

    [0, 0.5, 1].forEach((tick) => {
      const y = yScale(tick);
      append(svg, "line", { x1: dimensions.left, y1: y, x2: dimensions.right, y2: y, stroke: COLORS.grid, "stroke-width": 1 });
      addText(svg, dimensions.left - 8, y + 4, formatAxis(tick), { anchor: "end", size: 11 });
    });
    append(svg, "line", { x1: dimensions.left, y1: dimensions.bottom, x2: dimensions.right, y2: dimensions.bottom, stroke: COLORS.ink, "stroke-width": 1.25 });
    append(svg, "line", { x1: dimensions.left, y1: dimensions.top, x2: dimensions.left, y2: dimensions.bottom, stroke: COLORS.ink, "stroke-width": 1.25 });

    const groupWidth = (dimensions.right - dimensions.left) / metrics.length;
    const barWidth = Math.min(28, groupWidth * 0.28);
    metrics.forEach((metric, index) => {
      const center = xScale(index);
      const currentValue = Math.max(0, Math.min(1, currentMetrics[metric.key]));
      const baselineValue = Math.max(0, Math.min(1, baselineMetrics[metric.key]));
      const baselineY = yScale(baselineValue);
      const currentY = yScale(currentValue);

      append(svg, "rect", {
        x: center - barWidth - 2,
        y: baselineY,
        width: barWidth,
        height: dimensions.bottom - baselineY,
        fill: COLORS.baseline
      });
      append(svg, "rect", {
        x: center + 2,
        y: currentY,
        width: barWidth,
        height: dimensions.bottom - currentY,
        fill: COLORS.event
      });
      addText(svg, center - barWidth / 2 - 2, Math.max(dimensions.top + 12, baselineY - 5), formatMetric(baselineValue), {
        anchor: "middle",
        size: 10,
        fill: COLORS.baseline,
        weight: 700
      });
      addText(svg, center + barWidth / 2 + 2, Math.max(dimensions.top + 12, currentY - 5), formatMetric(currentValue), {
        anchor: "middle",
        size: 10,
        fill: COLORS.event,
        weight: 700
      });
      addText(svg, center, dimensions.bottom + 18, metric.shortLabel || metric.label, { anchor: "middle", size: 10, fill: COLORS.ink, weight: 700 });
    });

    addText(svg, 16, (dimensions.top + dimensions.bottom) / 2, "Metric value", {
      anchor: "middle",
      size: 12,
      weight: 700,
      fill: COLORS.ink,
      transform: `rotate(-90 16 ${(dimensions.top + dimensions.bottom) / 2})`
    });
    drawLegend(svg, [
      { label: "Selected", color: COLORS.event },
      { label: "Baseline", color: COLORS.baseline }
    ], 372, 21);
  }

  function unregisterLegacyShinyliveWorker() {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        const worker = registration.active || registration.waiting || registration.installing;
        if (worker && worker.scriptURL.includes("shinylive-sw.js")) {
          registration.unregister();
        }
      });
    }).catch(() => {
      // A failed cleanup does not affect the static simulator.
    });
  }

  function initialiseSimulator() {
    const root = document.getElementById("rare-event-simulator");
    if (!root) {
      return;
    }

    const prevalenceInput = document.getElementById("event-prevalence");
    const separationInput = document.getElementById("class-separation");
    const prevalenceValue = document.getElementById("event-prevalence-value");
    const separationValue = document.getElementById("class-separation-value");
    const summary = document.getElementById("rare-event-summary");
    const distributionChart = document.getElementById("distribution-chart");
    const metricsChart = document.getElementById("metrics-chart");
    const rocChart = document.getElementById("roc-chart");
    const prChart = document.getElementById("pr-chart");
    let animationFrame = 0;

    function render() {
      animationFrame = 0;
      const prevalence = Number(prevalenceInput.value) / 100;
      const separation = Number(separationInput.value);
      const state = { prevalence, separation };
      const characteristics = operatingCharacteristics(prevalence, separation);

      prevalenceValue.textContent = formatPercent(prevalence);
      separationValue.textContent = separation.toFixed(2);
      summary.textContent = `At a 0.50 decision threshold, positive predictive value is ${formatPercent(characteristics.ppv)} and sensitivity is ${formatPercent(characteristics.sensitivity)}.`;

      drawDistribution(distributionChart, state);
      drawMetrics(metricsChart, state);
      drawCurveChart(rocChart, {
        title: "Receiver operating characteristic curves",
        description: `The selected ROC curve uses separation ${separation.toFixed(2)}. The balanced baseline uses separation 0.50.`,
        xLabel: "1 - Specificity",
        yLabel: "Sensitivity",
        currentPoints: curveData(prevalence, separation),
        baselinePoints: curveData(BASELINE.prevalence, BASELINE.separation),
        xKey: "falsePositiveRate",
        yKey: "sensitivity",
        diagonal: true
      });
      drawCurveChart(prChart, {
        title: "Precision-recall curves",
        description: `The selected precision-recall curve uses ${formatPercent(prevalence)} event prevalence. The balanced baseline uses 50.0% event prevalence.`,
        xLabel: "Recall",
        yLabel: "Precision",
        currentPoints: curveData(prevalence, separation),
        baselinePoints: curveData(BASELINE.prevalence, BASELINE.separation),
        xKey: "recall",
        yKey: "precision",
        diagonal: false
      });
    }

    function scheduleRender() {
      if (animationFrame) {
        return;
      }
      animationFrame = window.requestAnimationFrame(render);
    }

    prevalenceInput.addEventListener("input", scheduleRender);
    separationInput.addEventListener("input", scheduleRender);
    window.addEventListener("resize", scheduleRender);
    render();
    unregisterLegacyShinyliveWorker();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialiseSimulator, { once: true });
  } else {
    initialiseSimulator();
  }
})();
