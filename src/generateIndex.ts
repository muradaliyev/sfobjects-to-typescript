import { DescribeSObjectResult, FieldType } from "./DescribeResult";
import { uniq } from "./utils";


export function generateIndexOld(describes: Record<string, DescribeSObjectResult>) {

    const dateTypes: Record<string, string | undefined> = {};
    const dateTimeTypes: Record<string, string | undefined> = {};
    const timeTypes: Record<string, string | undefined> = {};

    const objectValues = Object.keys(describes).map((t) => {

        const d = describes[t];

        dateTypes[t] = d.fields.some(f => f.type === 'date') ? `Date_Types_${t}` : undefined;
        dateTimeTypes[t] = d.fields.some(f => f.type === 'datetime') ? `Date_Time_Types_${t}` : undefined;
        timeTypes[t] = d.fields.some(f => f.type === 'time') ? `Time_Types_${t}` : undefined;

        return `    ['${t}']: {\n        ObjectType: ${t};\n        DateTypes: ${dateTypes[t] ?? 'never'};\n        DateTimeTypes: ${dateTimeTypes[t] ?? 'never'};\n        TimeTypes: ${timeTypes[t] ?? 'never'};\n    }`;
    })

    const typesImport = Object.keys(describes).map(t => `import { ${[t, dateTypes[t], dateTimeTypes[t], timeTypes[t]].filter(Boolean).join(', ')} } from "./${t}";`);

    return [
        ...typesImport,
        `\nexport type Objects_Index = {\n\n${objectValues.join(',\n\n')}\n\n}`
    ].join('\n')
}


export function generateIndexNold(describes: Record<string, DescribeSObjectResult>) {

    const objectValues = Object.keys(describes).map((t) => {

        function getTypeKeys(ft: FieldType) {

            const keys = describes[t].fields.filter(f => f.type === ft).map(f => f.name)

            return keys.length ? `'${keys.join(`' | '`)}'` : 'never';
        }

        return `    ['${t}']: {\n        ObjectType: ${t};\n        DateTypes: ${getTypeKeys('date')};\n        DateTimeTypes: ${getTypeKeys('datetime')};\n        TimeTypes: ${getTypeKeys('time')};\n    }`;
    })

    const typesImport = Object.keys(describes).map(t => `import { ${t} } from "./${t}";`);

    return [
        ...typesImport,
        `\nexport type SfObjects = {\n\n${objectValues.join(',\n\n')}\n\n}`
    ].join('\n')
}


export function generateIndex(describes: Record<string, DescribeSObjectResult>) {


    const constValues = Object.keys(describes).map((t) => {

        function getTypeKeys(ft: FieldType) {

            const keys = describes[t].fields.filter(f => f.type === ft).map(f => f.name)

            return keys.length ? `['${keys.join(`', '`)}']` : '[]';
        }

        function getLookupTypes() {

            const kv = (describes[t].fields || [])
                .filter(f => (f.type === 'reference' && !!f.relationshipName))
                .reduce((p, f, i) => ({ ...p, [f.relationshipName || '']: uniq(f.referenceTo || []).filter(rt => !!describes[rt]) }), {} as Record<string, string[]>);

            return `{${Object.keys(kv).filter(k => (kv[k].length === 1)).map(k => `\n            '${k}': '${kv[k][0]}'`).join(', ')}\n        }`;
        }

        function getChildTableTypes() {

            const kv = (describes[t].childRelationships || [])
                .filter(v => (!!v.relationshipName && !!describes[v.childSObject]))
                .reduce((p, f, i) => ({ ...p, [f.relationshipName || '']: f.childSObject }), {} as Record<string, string>);

            return `{${Object.keys(kv).filter(k => !!kv[k]).map(k => `\n            '${k}': '${kv[k]}'`).join(', ')}\n        }`;
        }

        // function getChildTableKeys() {
        //     const keys = (describes[t].childRelationships || []).map(v => v.relationshipName).filter(n => !!n)

        //     return keys.length ? `['${keys.join(`', '`)}']` : '[]';
        // }

        return `    '${t}': {\n        dateTypes: ${getTypeKeys('date')},\n        dateTimeTypes: ${getTypeKeys('datetime')},\n        timeTypes: ${getTypeKeys('time')},\n        lookupTypes: ${getLookupTypes()},\n        childTables: ${getChildTableTypes()}\n    }`;
    })


    const typesImport = Object.keys(describes).map(t => `import { ${t} } from "./${t}";`);

    return [
        ...typesImport,
        `\nexport type SfObjectConfig = { dateTypes: string[], dateTimeTypes: string[], timeTypes: string[], lookupTypes: Record<string,string>, childTables: Record<string,string> };`,
        `\nexport const OBJ_CONFIG: Record<string, SfObjectConfig> = {\n\n${constValues.join(',\n\n')}\n\n}`,
        `\nexport type SfObjects = {\n\n${Object.keys(describes).map((t) => `    ['${t}']: ${t}`).join(',\n\n')}\n\n}`
    ].join('\n')
}