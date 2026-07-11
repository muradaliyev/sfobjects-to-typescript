import { DescribeSObjectResult, FieldType } from "./DescribeResult";


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


export function generateIndex(describes: Record<string, DescribeSObjectResult>) {

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