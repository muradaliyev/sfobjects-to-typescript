import { Connection, DescribeSObjectResult, Field, FieldType } from "jsforce";
import _ from "lodash";
import * as fs from 'fs';

export interface ConvertOptions {
    login_url?: string;
    server_url?: string;
    instance_url?: string;
    client_id?: string;
    client_secret?: string;
    access_token?: string;
    username: string;
    password: string;
    token?: string;
    objects: string[];
    output?: string;
}

const TYPE_MAP: Record<Exclude<FieldType, 'picklist'>, string> = {
    'address': 'string',
    'anyType': 'any',
    'base64': 'string',
    'boolean': 'boolean',
    'combobox': 'string',
    'complexvalue': 'unknown',
    'currency': 'number',
    'date': 'string',
    'datetime': 'string',
    'double': 'number',
    'email': 'string',
    'encryptedstring': 'string',
    'id': 'string',
    'int': 'number',
    'location': 'unknown',
    'multipicklist': 'unknown',
    'percent': 'number',
    'reference': 'string',
    'string': 'string',
    'textarea': 'string',
    'time': 'string',
    'url': 'string',
    'phone': 'string'
}

function fieldToType(f: Field) {
    if (f.type === 'picklist') {
        return _(f.picklistValues || []).map(v => `\n    "${v.value}" /*${v.label}*/`).join(' | ');
    }
    else {
        return TYPE_MAP[f.type];
    }
}

function generateType(d: DescribeSObjectResult, otherNames: string[] = [], path?: string) {

    const usedTypes: string[] = [];

    const n = _(d.fields || [])
        .reduce((p, v, i) => ({ ...p, [v.name]: fieldToType(v) }), {} as Record<string, string>);

    const r = _(d.fields || [])
        .reduce((p, v, i) => {

            if (v.type === 'reference' && !!v.relationshipName) {
                return {
                    ...p,
                    [v.relationshipName]: _(v.referenceTo || []).map(r => {

                        if (otherNames.some(on => on === r)) {
                            usedTypes.push(r);
                            return r;
                        }

                        return `object /* ${r} */`;
                    }).uniq().join(" | ")
                }
            }

            return p;

        }, {} as Record<string, string>)


    return _([
        ..._(usedTypes).uniq().filter(t => t !== d.name).map(t => `import { ${t} } from "./${t}";`).value(),
        `export interface ${d.name} {${_({ ...n, ...r }).map((v, k) => `\n  ${k}: ${v}`).join(';')}  \n}`
    ]).join('\n');
}


export async function convert(o: ConvertOptions) {

    const sf = new Connection({
        loginUrl: o.login_url,
        serverUrl: o.server_url,
        instanceUrl: o.instance_url,
        clientId: o.client_id,
        clientSecret: o.client_secret,
        accessToken: o.access_token
    });

    try {
        console.log('Logging in...');

        const u = await sf.login(o.username, `${o.password}${o.token || ''}`); //loginbysoap? //loginbyoauth?

        try {
            console.log(`id: ${u.id}, org Id: ${u.organizationId}, url: ${u.url}`);

            for (var n of o.objects) {

                console.log(`Fetching metadata for object ${n}...`);

                const d = await sf.describe(n);

                const t = generateType(d, o.objects);

                if (o.output) {

                    const f = _([o.output, `${n}.ts`]).compact().join('/');

                    console.log(`Saving to file ${f}...`);

                    await fs.promises.writeFile(f, t);
                }
                else {
                    console.log(t);
                }
            }

            console.log('Done!');
        }
        catch (err) {
            console.log(`!!!Error: ${err}`);
        }
        finally {
            await sf.logout();
        }
    }
    catch (cerr) {
        console.log(`!!!Connection error: ${cerr}`)
    }
}