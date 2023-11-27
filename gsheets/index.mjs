import {GoogleSpreadsheet, GoogleSpreadsheetWorksheet} from "google-spreadsheet";
import {JWT} from "google-auth-library";
import yaml from "yaml";
import fs from 'fs/promises';
import {temporaryFile} from "tempy";
import runQuery from '@evidence-dev/duckdb';

/**
 * @typedef {Object} GoogleSheetsOptions
 * @property {string} client_email
 * @property {string} private_key
 */

/** @type {import("@evidence-dev/db-commons").ProcessSource<GoogleSheetsOptions>} */
export async function* processSource(opts, files, utils) {
    const auth = new JWT({
        email: opts.client_email,
        key: opts.private_key,
        scopes: SCOPES,
    });

    if (!("connection.yaml" in files))
        throw new Error("connection.yaml is missing; this is odd");
    if (typeof files["connection.yaml"] !== "function") throw new Error("connection.yaml is a directory; this is odd")
    const connYaml = await files["connection.yaml"]();

    const conn = yaml.parse(connYaml);
    if (!("sheets" in conn)) {
        console.log("No sheets found in connection.yaml");
        return null;
    }

    const {sheets} = conn;
    if (Array.isArray(sheets)) {
        console.log("Sheets should not be an array");
        return null;
    }
    if (typeof sheets !== "object") {
        console.log("Sheets should be an object");
        return null;
    }


    for (const [name, id] of Object.entries(sheets)) {
        /** @type {GoogleSpreadsheet} */
        let sheet;
        if (typeof id === "string") {
            sheet = new GoogleSpreadsheet(id, auth)
        } else {
            if ("id" in id) {
                sheet = new GoogleSpreadsheet(id.id, auth)
            } else {
                throw new Error(`Sheet ${name} does not have an id!`)
            }
        }

        await sheet.loadInfo()

        /** @type {Array<GoogleSpreadsheetWorksheet>} */
        let pages
        if (typeof id === "string" || !("pages" in id)) {
            // All pages
            pages = Object.values(sheet.sheetsById)
        } else {
            if (!Array.isArray(id.pages)) {
                throw new Error(`Sheet ${name} has some pages provided, but not as an array`)
            }
            pages = sheet.sheetsByIndex.filter(sheet =>
                id.pages.includes(sheet.a1SheetName.substr(1, sheet.a1SheetName.length - 2)) // a1SheetName is wrapped in ', we need to remove that
            )

            pages = id.pages.reduce((a,v) => {
                const worksheet = sheet.sheetsByTitle[v]
                if (!worksheet) {
                    console.warn(`Expected to find page ${v} in ${sheet.title}, but did not find it.`)
                } else {
                    a.push(worksheet)
                }

                return a
            }, [])

        }

        if (!pages.length) {
            console.warn(`Sheet ${name} does not include any pages!`)
        }

        for (const page of pages) {
            const pageFile = temporaryFile({extension: 'csv'})
            await fs.writeFile(pageFile, await page.downloadAsCSV(true))

            const {rows, columnTypes} = await runQuery(`SELECT *
                                                        FROM '${pageFile}'`, {filename: ':memory:'})

            yield {
                rows: async function* () {
                    for await (const batch of rows()) {
                        yield batch.filter(
                            // This filters out rows that are ONLY undefined, null, or emptystring.
                            // TODO: Is this desired behavior?
                            row => Object.values(row).some(col => ![undefined, null, ''].includes(col))
                        )
                    }
                },
                columnTypes: columnTypes,
                name: name + "_" + page.title.replaceAll(" ", "_").toLowerCase(),
                content: name + "_" + page.title
            }
        }
    }
    return null
}

const SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.file",
];

export const options = {
    keyfile: {
        title: "Credentials File",
        type: "file",
        fileFormat: "json",
        virtual: true,
        description: "Google Cloud Platform Service Account keyfile"
    },
    client_email: {
        title: "Client Email",
        type: "string",
        secret: true,
        required: true,
        references: "$.keyfile.client_email",
        forceReference: true,
    },
    private_key: {
        title: "Private Key",
        type: "string",
        secret: true,
        required: true,
        references: "$.keyfile.private_key",
        forceReference: true,
    },
};

export default {options};

/**@type {import("@evidence-dev/db-commons").ConnectionTester<GoogleSheetsOptions>} */
export const testConnection = async (opts) => {
    const auth = new JWT({
        email: opts.client_email,
        key: opts.private_key,
        scopes: SCOPES,
    });
    try {
        await auth.authorize();
        return true;
    } catch (e) {
        return {
            reason: e.message ?? "Failed to authenticate",
        };
    }
};

export const getRunner = () => {
    throw new Error(
        "Google Sheets connector does not support getRunner. Do you need to update your Evidence version?"
    );
};
