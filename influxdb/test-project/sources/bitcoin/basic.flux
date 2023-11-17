import "date"

from(bucket: "metrics")
  |> range(stop: now(), start: date.sub(d: 14d, from: now()) )
  |> filter(fn: (r) => r["_measurement"] == "traefik.entrypoint.requests.total")
  |> aggregateWindow(every: 15m, fn: sum, createEmpty: true)
  |> yield(name: "sum")
