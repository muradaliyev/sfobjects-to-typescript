import { DescribeSObjectResult } from "./DescribeResult";


export function generateIndex(describes: Record<string, DescribeSObjectResult>) {

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