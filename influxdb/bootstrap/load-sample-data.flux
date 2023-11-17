import "influxdata/influxdb/sample"

sample.data(set: "bitcoin")
    |> to(bucket: "bitcoin")