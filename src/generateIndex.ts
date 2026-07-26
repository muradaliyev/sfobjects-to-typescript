import { DescribeSObjectResult, FieldType } from "./DescribeResult";
import { uniq } from "./utils";


// export function generateIndexOld(describes: Record<string, DescribeSObjectResult>) {

//     const dateTypes: Record<string, string | undefined> = {};
//     const dateTimeTypes: Record<string, string | undefined> = {};
//     const timeTypes: Record<string, string | undefined> = {};

//     const objectValues = Object.keys(describes).map((t) => {

//         const d = describes[t];

//         dateTypes[t] = d.fields.some(f => f.type === 'date') ? `Date_Types_${t}` : undefined;
//         dateTimeTypes[t] = d.fields.some(f => f.type === 'datetime') ? `Date_Time_Types_${t}` : undefined;
//         timeTypes[t] = d.fields.some(f => f.type === 'time') ? `Time_Types_${t}` : undefined;

//         return `    ['${t}']: {\n        ObjectType: ${t};\n        DateTypes: ${dateTypes[t] ?? 'never'};\n        DateTimeTypes: ${dateTimeTypes[t] ?? 'never'};\n        TimeTypes: ${timeTypes[t] ?? 'never'};\n    }`;
//     })

//     const typesImport = Object.keys(describes).map(t => `import { ${[t, dateTypes[t], dateTimeTypes[t], timeTypes[t]].filter(Boolean).join(', ')} } from "./${t}";`);

//     return [
//         ...typesImport,
//         `\nexport type Objects_Index = {\n\n${objectValues.join(',\n\n')}\n\n}`
//     ].join('\n')
// }


// export function generateIndexNold(describes: Record<string, DescribeSObjectResult>) {

//     const objectValues = Object.keys(describes).map((t) => {

//         function getTypeKeys(ft: FieldType) {

//             const keys = describes[t].fields.filter(f => f.type === ft).map(f => f.name)

//             return keys.length ? `'${keys.join(`' | '`)}'` : 'never';
//         }

//         return `    ['${t}']: {\n        ObjectType: ${t};\n        DateTypes: ${getTypeKeys('date')};\n        DateTimeTypes: ${getTypeKeys('datetime')};\n        TimeTypes: ${getTypeKeys('time')};\n    }`;
//     })

//     const typesImport = Object.keys(describes).map(t => `import { ${t} } from "./${t}";`);

//     return [
//         ...typesImport,
//         `\nexport type SfObjects = {\n\n${objectValues.join(',\n\n')}\n\n}`
//     ].join('\n')
// }


export function generateIndex(describes: Record<string, DescribeSObjectResult>, recTypeDevNames: Record<string, Record<string, string>>, instance: string) {


    const constValues = Object.keys(describes)
        .map((t) => {

            function getTypeKeys(ft: FieldType) {

                const keys = describes[t].fields.filter(f => f.type === ft).map(f => f.name)

                return keys.length ? `['${keys.join(`', '`)}']` : '[]';
            }

            function getLookupTypes() {

                const kv = (describes[t].fields || [])
                    .filter(f => (f.type === 'reference' && !!f.relationshipName))
                    .reduce((p, f, i) => ({ ...p, [f.relationshipName || '']: uniq(f.referenceTo || []).filter(rt => !!describes[rt]) }), {} as Record<string, string[]>);

                return `{${Object.keys(kv).filter(k => (kv[k].length === 1)).map(k => `\n            '${k}': '${kv[k][0]}'`).join(',')}\n        }`;
            }

            function getChildTableTypes() {

                const kv = (describes[t].childRelationships || [])
                    .filter(v => (!!v.relationshipName && !!describes[v.childSObject]))
                    .reduce((p, f, i) => ({ ...p, [f.relationshipName || '']: f.childSObject }), {} as Record<string, string>);

                return `{${Object.keys(kv).filter(k => !!kv[k]).map(k => `\n            '${k}': '${kv[k]}'`).join(',')}\n        }`;
            }

            function getRecordTypes() {
                return `{${describes[t].recordTypeInfos.filter(i => !!recTypeDevNames[t][i.recordTypeId]).map(i => `\n            '${recTypeDevNames[t][i.recordTypeId]}': '${i.recordTypeId}'`).join(',')}\n        }`
            }

            const _o: Record<string, string> = {
                objectPrefix: ` '${describes[t].keyPrefix || ''}'`,
                dateTypes: getTypeKeys('date'),
                dateTimeTypes: getTypeKeys('datetime'),
                timeTypes: getTypeKeys('time'),
                lookupTypes: getLookupTypes(),
                childTables: getChildTableTypes(),
                recordTypes: getRecordTypes()
            }

            return `\n    '${t}': {${Object.keys(_o).map(k => `\n        ${k}:${_o[k]}`).join(',')}\n    }`;
        })


    //`export const object_prefix_${describe.name} = '${describe.keyPrefix}';`,

    return [
        //`import { BasicClient, ISfConnection,SfObjectConfig } from "../BasicClient";`,
        Object.keys(describes).map(t => `import { ${t} } from "./${t}";`).join('\n'),
        `export const SFOBJECTS_INSTANCE = '${instance}';`,
        `export const SFOBJECTS_CONFIG = {\n${constValues.join(',\n')}\n}`,
        `export type SfObjectsIndex = {\n${Object.keys(describes).map((t) => `    ['${t}']: ${t}`).join(',\n')}\n}`,
        //`export const getBasicClient = (c: ISfConnection) => new BasicClient<SfObjects>(OBJ_CONFIG, c)`,
        `export type { ${Object.keys(describes).join(', ')} };`,
    ].join('\n\n')
}