import { InfluxDB } from '@influxdata/influxdb-client'
import {EvidenceType, TypeFidelity} from '@evidence-dev/db-commons';
export const options = {
    token: {
        title: "Token",
        secret: true,
        required: true,
        type: "string"
    },
    url: {
        title: "URL",
        secret: false,
        required: true,
        type: "string"
    },
    organization: {
        title: "Organization",
        secret: false,
        required: true,
        type: "string"
    }
}

/** @type {Record<Exclude<import('@influxdata/influxdb-client').ColumnType>, import("@evidence-dev/db-commons").EvidenceType} */
const EvidenceTypeMap = {
    'boolean': EvidenceType.BOOLEAN,
    'unsignedLong': EvidenceType.NUMBER,
    'long' : EvidenceType.NUMBER,
    'double': EvidenceType.NUMBER,
    'string': EvidenceType.STRING,
    'base64Binary': EvidenceType.STRING,
    'dateTime:RFC3339': EvidenceType.DATE,
    'duration': EvidenceType.STRING // ??
}


/**
 * 
 * @param {import('@influxdata/influxdb-client').Row} row 
 */
const cleanRow = (row) => {
    const rowObj = row.tableMeta.toObject(row.values)
    for (const dateField of row.tableMeta.columns.filter(c => c.dataType === "dateTime:RFC3339")) {
        rowObj[dateField.label] = new Date(rowObj[dateField.label])
    }

    return rowObj
}

/** 
 * @typedef {Object} InfluxDb2Options
 * @property {string} token
 * @property {string} url
 * @property {string} organization
 */

/** @type {import('@evidence-dev/db-commons').GetRunner<InfluxDb2Options>} */
export const getRunner = async (opts) => {
    const client = new InfluxDB({...opts, transportOptions: { rejectUnauthorized: false }})
    const readApi = client.getQueryApi(opts.organization)
    return async (queryContent, queryPath, batchSize) => {
        if (!queryPath.endsWith(".flux")) return null;

        /** @type {AsyncIterable<import('@influxdata/influxdb-client').Row>} */
        const rows = readApi.iterateRows(queryContent)

        
        /** @type {import('@influxdata/influxdb-client').Row} */
        const first = await rows.next().then(r => r.value)
        let batch = [cleanRow(first)]
        
        const cols = first.tableMeta.columns.map(c => ({
            name: c.label,
            evidenceType: EvidenceTypeMap[c.dataType],
            typeFidelity: TypeFidelity.PRECISE
        }))        
        
        return {
            rows: async function* () {
                for await (const row of rows) {
                    const cleanedRow = cleanRow(row)
                    batch.push(cleanedRow)
                    if (batch.length >= batchSize) {
                        yield batch
                        batch = []
                    }
                }
                yield batch
            },
            columnTypes: cols,
            expectedRowCount: 0
        }
    }
}