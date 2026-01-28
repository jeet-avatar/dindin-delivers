/**
 * Metrics Service - Prometheus Metrics for AI Employee System
 *
 * Provides metrics for:
 * - Employee deployments (counter with labels: employeeId, status)
 * - Deployment duration (histogram with labels: employeeId)
 * - Employee health status
 * - Hot-reload events
 */

// Simple in-memory metrics store (for environments without prom-client)
const metricsStore = {
  counters: {},
  histograms: {},
  gauges: {}
};

/**
 * Counter metric implementation
 */
class Counter {
  constructor(name, help, labels = []) {
    this.name = name;
    this.help = help;
    this.labelNames = labels;
    metricsStore.counters[name] = { help, labels, values: {} };
  }

  inc(labels = {}, value = 1) {
    const key = this._labelKey(labels);
    if (!metricsStore.counters[this.name].values[key]) {
      metricsStore.counters[this.name].values[key] = { labels, value: 0 };
    }
    metricsStore.counters[this.name].values[key].value += value;
  }

  _labelKey(labels) {
    return Object.entries(labels).sort().map(([k, v]) => `${k}="${v}"`).join(',');
  }

  get() {
    return metricsStore.counters[this.name];
  }
}

/**
 * Histogram metric implementation
 */
class Histogram {
  constructor(name, help, options = {}) {
    this.name = name;
    this.help = help;
    this.labelNames = options.labelNames || [];
    this.buckets = options.buckets || [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120];
    metricsStore.histograms[name] = {
      help,
      labels: this.labelNames,
      buckets: this.buckets,
      values: {}
    };
  }

  observe(labels = {}, value) {
    const key = this._labelKey(labels);
    if (!metricsStore.histograms[this.name].values[key]) {
      metricsStore.histograms[this.name].values[key] = {
        labels,
        count: 0,
        sum: 0,
        buckets: this.buckets.map(b => ({ le: b, count: 0 }))
      };
    }

    const hist = metricsStore.histograms[this.name].values[key];
    hist.count++;
    hist.sum += value;

    for (const bucket of hist.buckets) {
      if (value <= bucket.le) {
        bucket.count++;
      }
    }
  }

  startTimer(labels = {}) {
    const start = Date.now();
    return () => {
      const duration = (Date.now() - start) / 1000;
      this.observe(labels, duration);
      return duration;
    };
  }

  _labelKey(labels) {
    return Object.entries(labels).sort().map(([k, v]) => `${k}="${v}"`).join(',');
  }

  get() {
    return metricsStore.histograms[this.name];
  }
}

/**
 * Gauge metric implementation
 */
class Gauge {
  constructor(name, help, labels = []) {
    this.name = name;
    this.help = help;
    this.labelNames = labels;
    metricsStore.gauges[name] = { help, labels, values: {} };
  }

  set(labels = {}, value) {
    const key = this._labelKey(labels);
    metricsStore.gauges[this.name].values[key] = { labels, value };
  }

  inc(labels = {}, value = 1) {
    const key = this._labelKey(labels);
    if (!metricsStore.gauges[this.name].values[key]) {
      metricsStore.gauges[this.name].values[key] = { labels, value: 0 };
    }
    metricsStore.gauges[this.name].values[key].value += value;
  }

  dec(labels = {}, value = 1) {
    this.inc(labels, -value);
  }

  _labelKey(labels) {
    return Object.entries(labels).sort().map(([k, v]) => `${k}="${v}"`).join(',');
  }

  get() {
    return metricsStore.gauges[this.name];
  }
}

// ============================================================================
// Employee Deployment Metrics
// ============================================================================

/**
 * Counter: Total employee deployments
 * Labels: employeeId, status (success|failure|rollback)
 */
const employeeDeploymentsTotal = new Counter(
  'employee_deployments_total',
  'Total number of employee deployments',
  ['employeeId', 'status']
);

/**
 * Histogram: Deployment duration in seconds
 * Labels: employeeId
 */
const employeeDeploymentDuration = new Histogram(
  'employee_deployment_duration_seconds',
  'Duration of employee deployments in seconds',
  {
    labelNames: ['employeeId'],
    buckets: [0.5, 1, 2, 5, 10, 30, 60, 120, 300]
  }
);

/**
 * Counter: Hot-reload events
 * Labels: employeeId, result (success|failure)
 */
const employeeHotReloadTotal = new Counter(
  'employee_hot_reload_total',
  'Total number of hot-reload events',
  ['employeeId', 'result']
);

/**
 * Gauge: Employee health status
 * Labels: employeeId
 * Values: 1 = healthy, 0 = unhealthy
 */
const employeeHealthStatus = new Gauge(
  'employee_health_status',
  'Current health status of employee (1=healthy, 0=unhealthy)',
  ['employeeId']
);

/**
 * Gauge: Active employees count
 */
const employeeActiveCount = new Gauge(
  'employee_active_count',
  'Number of currently active employees',
  ['department']
);

/**
 * Counter: Employee validation events
 * Labels: employeeId, result (passed|failed)
 */
const employeeValidationTotal = new Counter(
  'employee_validation_total',
  'Total number of employee validations',
  ['employeeId', 'result']
);

// ============================================================================
// Metrics API
// ============================================================================

/**
 * Record a deployment event
 */
function recordDeployment(employeeId, status, durationSeconds) {
  employeeDeploymentsTotal.inc({ employeeId, status });
  if (durationSeconds !== undefined) {
    employeeDeploymentDuration.observe({ employeeId }, durationSeconds);
  }
}

/**
 * Start a deployment timer
 * Returns a function to call when deployment completes
 */
function startDeploymentTimer(employeeId) {
  const endTimer = employeeDeploymentDuration.startTimer({ employeeId });
  return (status = 'success') => {
    const duration = endTimer();
    employeeDeploymentsTotal.inc({ employeeId, status });
    return duration;
  };
}

/**
 * Record a hot-reload event
 */
function recordHotReload(employeeId, result) {
  employeeHotReloadTotal.inc({ employeeId, result });
}

/**
 * Update employee health status
 */
function setHealthStatus(employeeId, healthy) {
  employeeHealthStatus.set({ employeeId }, healthy ? 1 : 0);
}

/**
 * Update active employee count
 */
function setActiveEmployeeCount(department, count) {
  employeeActiveCount.set({ department }, count);
}

/**
 * Record a validation event
 */
function recordValidation(employeeId, passed) {
  employeeValidationTotal.inc({ employeeId, result: passed ? 'passed' : 'failed' });
}

/**
 * Get all metrics in Prometheus format
 */
function getMetrics() {
  const lines = [];

  // Counters
  for (const [name, metric] of Object.entries(metricsStore.counters)) {
    lines.push(`# HELP ${name} ${metric.help}`);
    lines.push(`# TYPE ${name} counter`);
    for (const [, data] of Object.entries(metric.values)) {
      const labelStr = Object.entries(data.labels).map(([k, v]) => `${k}="${v}"`).join(',');
      lines.push(`${name}{${labelStr}} ${data.value}`);
    }
  }

  // Histograms
  for (const [name, metric] of Object.entries(metricsStore.histograms)) {
    lines.push(`# HELP ${name} ${metric.help}`);
    lines.push(`# TYPE ${name} histogram`);
    for (const [, data] of Object.entries(metric.values)) {
      const labelStr = Object.entries(data.labels).map(([k, v]) => `${k}="${v}"`).join(',');
      for (const bucket of data.buckets) {
        lines.push(`${name}_bucket{${labelStr},le="${bucket.le}"} ${bucket.count}`);
      }
      lines.push(`${name}_bucket{${labelStr},le="+Inf"} ${data.count}`);
      lines.push(`${name}_sum{${labelStr}} ${data.sum}`);
      lines.push(`${name}_count{${labelStr}} ${data.count}`);
    }
  }

  // Gauges
  for (const [name, metric] of Object.entries(metricsStore.gauges)) {
    lines.push(`# HELP ${name} ${metric.help}`);
    lines.push(`# TYPE ${name} gauge`);
    for (const [, data] of Object.entries(metric.values)) {
      const labelStr = Object.entries(data.labels).map(([k, v]) => `${k}="${v}"`).join(',');
      lines.push(`${name}{${labelStr}} ${data.value}`);
    }
  }

  return lines.join('\n');
}

/**
 * Get metrics as JSON object
 */
function getMetricsJSON() {
  return {
    timestamp: new Date().toISOString(),
    counters: Object.fromEntries(
      Object.entries(metricsStore.counters).map(([name, metric]) => [
        name,
        {
          help: metric.help,
          values: metric.values
        }
      ])
    ),
    histograms: Object.fromEntries(
      Object.entries(metricsStore.histograms).map(([name, metric]) => [
        name,
        {
          help: metric.help,
          values: metric.values
        }
      ])
    ),
    gauges: Object.fromEntries(
      Object.entries(metricsStore.gauges).map(([name, metric]) => [
        name,
        {
          help: metric.help,
          values: metric.values
        }
      ])
    )
  };
}

/**
 * Reset all metrics (for testing)
 */
function resetMetrics() {
  metricsStore.counters = {};
  metricsStore.histograms = {};
  metricsStore.gauges = {};

  // Re-initialize metrics
  employeeDeploymentsTotal.constructor.call(
    employeeDeploymentsTotal,
    'employee_deployments_total',
    'Total number of employee deployments',
    ['employeeId', 'status']
  );
  employeeDeploymentDuration.constructor.call(
    employeeDeploymentDuration,
    'employee_deployment_duration_seconds',
    'Duration of employee deployments in seconds',
    { labelNames: ['employeeId'], buckets: [0.5, 1, 2, 5, 10, 30, 60, 120, 300] }
  );
}

// ============================================================================
// Express Middleware
// ============================================================================

/**
 * Express middleware to expose /metrics endpoint
 */
function metricsMiddleware(req, res, next) {
  if (req.path === '/metrics') {
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(getMetrics());
  } else if (req.path === '/metrics/json') {
    res.json(getMetricsJSON());
  } else {
    next();
  }
}

// ============================================================================
// Exports
// ============================================================================

module.exports = {
  // Metric instances
  employeeDeploymentsTotal,
  employeeDeploymentDuration,
  employeeHotReloadTotal,
  employeeHealthStatus,
  employeeActiveCount,
  employeeValidationTotal,

  // Helper functions
  recordDeployment,
  startDeploymentTimer,
  recordHotReload,
  setHealthStatus,
  setActiveEmployeeCount,
  recordValidation,

  // Output functions
  getMetrics,
  getMetricsJSON,
  resetMetrics,

  // Middleware
  metricsMiddleware,

  // Classes for custom metrics
  Counter,
  Histogram,
  Gauge
};
