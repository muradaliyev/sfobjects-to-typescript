import { DescribeSObjectResult, Field } from "jsforce";
import _ from "lodash";

const TYPE_MAP: Record<string, string> = {
    'address': 'string',
    'anyType': 'any',
    'base64': 'string',
    'boolean': 'boolean',
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
    'percent': 'number',
    'reference': 'string',
    'string': 'string',
    'textarea': 'string',
    'time': 'string',
    'url': 'string',
    'phone': 'string'
}

type ExtractorProxyType = 'standard' | 'multiPicklist' | 'childTable';

interface ExtractorObjectProp {
    name: string;
    typeName: string;
    proxyType: ExtractorProxyType;
    readOnly?: boolean;
    optional?: boolean;
}

class Bitset {
    private _data: Uint8Array | Buffer;

    constructor(data: string) {
        this._data = data ? Buffer.from(data, 'base64') : new Uint8Array(0);
    }

    testBit(n: number): boolean {
        return (this._data[n >> 3] & (0x80 >> (n % 8))) !== 0;
    }

    size(): number {
        return this._data.length * 8;
    }
}


export interface ExtractorConfig {
    describe: DescribeSObjectResult;
    otherTypeNames: string[];
    recTypeDevNames: Record<string, string>;
    instance: string;
}


export function extractTypes(o: ExtractorConfig) {

    const { describe, otherTypeNames: otherNames, recTypeDevNames, instance } = o;

    const usedTypes: string[] = [];

    const dateTypes: string[] = [];

    const picklistTypes: Record<string, string> = {};

    const picklistArrays: Record<string, string> = {};

    const recordTypeConstants: Record<string, string> = {};

    const picklistMaps: Record<string, Record<string, string>> = {};

    const picklistHierarchies: Record<string, Record<string, Record<string, string[]>>> = {};


    function fieldToName(v: Field, asRef?: boolean): Pick<ExtractorObjectProp, 'name' | 'readOnly' | 'optional'> {

        if (!asRef) {
            if (v.name === 'RecordTypeId') {
                return {
                    name: v.name,
                    readOnly: false,
                    optional: false
                }
            }

            if (v.name === 'OwnerId') {
                return {
                    name: v.name,
                    readOnly: true,
                    optional: false
                }
            }
        }

        return {
            name: (v.type === 'reference' && asRef) ? v.relationshipName ?? '__unknown__' : v.name,
            readOnly: (v.type === 'reference' && asRef) || !v.updateable,
            optional: v.nillable || v.type === 'boolean'
        }
    }

    function getRefType(t: string) {

        if (otherNames.some(on => on === t)) {
            usedTypes.push(t);
            return t;
        }

        return 'object';
    }

    function asChildTable(typeName: string) {
        return `{ totalSize: number, done: boolean, records: ${typeName}[] }`;
    }


    function fieldToType(f: Field, d: DescribeSObjectResult): Pick<ExtractorObjectProp, 'typeName' | 'proxyType'> {

        //console.log(`[${d.name}]:[${f.name}]:[${f.type}]`)

        if (f.name === 'RecordTypeId') {

            const rtTypeName = `RecordType_${describe.name}`;


            picklistTypes[rtTypeName] = d.recordTypeInfos
                .map(i => {

                    const devName = recTypeDevNames[i.recordTypeId];

                    if (!devName) {
                        throw `Unable to identify dev name for record type [${i.recordTypeId}]`
                    }

                    recordTypeConstants[devName] = i.recordTypeId;

                    return `\n    typeof RecordType_${devName} /*${i.name ?? devName}*/`
                })
                .join(' | ');

            return {
                proxyType: 'standard',
                typeName: rtTypeName
            }
        }

        else if (f.type === 'picklist' || f.type === 'multipicklist' || f.type === 'combobox') {

            const plTypeName = `Picklist_${describe.name}_${f.name}`;

            picklistArrays[plTypeName] = _(f.picklistValues || []).map(v => `\n    "${v.value}" /*${v.label}*/`).join(',');

            picklistTypes[plTypeName] = `(typeof ${plTypeName}_array)[number]`;

            if (f.picklistValues?.some(v => (v.value !== v.label))) {
                picklistMaps[plTypeName] = (f.picklistValues || []).reduce((p, v, i) => ({ ...p, [v.value]: v.label ?? v.value }), {});
            }

            if (f.dependentPicklist && f.controllerName) {

                const controller = _.find(d.fields, cf => (cf.name === f.controllerName));

                if (!controller) {
                    throw `Unable to identify controller for field ${f.name}`
                }

                const cTypeName = (controller.type === 'picklist' || controller.type === 'multipicklist' || controller.type === 'combobox') ? `Picklist_${describe.name}_${controller.name}` : TYPE_MAP[controller.type];

                picklistHierarchies[cTypeName] = picklistHierarchies[cTypeName] || {};

                picklistHierarchies[cTypeName][plTypeName] = picklistHierarchies[cTypeName][plTypeName] || {};

                for (const picklistValue of (f.picklistValues || [])) {

                    const validFor: Bitset = new Bitset(picklistValue.validFor ?? '');

                    let vvf: string[] = [];// | undefined = undefined;

                    if (controller.type === 'picklist') {

                        for (let k = 0; k < validFor.size(); k++) {
                            if (validFor.testBit(k)) {
                                vvf.push((controller.picklistValues || [])[k].value);
                            }
                        }
                    } else if (controller.type === 'boolean') {
                        if (validFor.testBit(1)) {
                            vvf.push("true");
                        }
                        if (validFor.testBit(0)) {
                            vvf.push("false");
                        }
                    }

                    for (const vf of vvf) {
                        picklistHierarchies[cTypeName][plTypeName][vf] = picklistHierarchies[cTypeName][plTypeName][vf] || [];
                        picklistHierarchies[cTypeName][plTypeName][vf].push(picklistValue.value);
                    }
                }
            }

            return {
                proxyType: f.type === 'multipicklist' ? 'multiPicklist' : 'standard',
                typeName: plTypeName
            }
        }

        else {

            if (f.type === 'date') {
                dateTypes.push(f.name);
            }

            return {
                typeName: TYPE_MAP[f.type],
                proxyType: 'standard'
            }
        }
    }


    function renderInterfacePropOld(p: ExtractorObjectProp) {
        return `  ${p.readOnly ? 'readonly ' : ''}${p.name}${p.optional ? '?' : ''} : ${(p.proxyType === 'multiPicklist' && 'string') || (p.proxyType === 'childTable' && asChildTable(p.typeName)) || p.typeName};`;
    }

    function renderInterfaceProp(p: ExtractorObjectProp) {
        return `  ${p.readOnly ? 'readonly ' : ''}${p.name} : ${(p.proxyType === 'multiPicklist' && 'string') || (p.proxyType === 'childTable' && asChildTable(p.typeName)) || p.typeName}${p.optional ? ' | null' : ''};`;
    }

    function renderPicklistMap(maps: Record<string, string>, name: string) {
        return `export const map_${name} : Record<${name},string>={\n${_(maps).mapValues((v, k) => '    ["' + k + '"] : "' + v + '"').values().join(`,\n`)}\n}`
    }



    function renderPicklistHierarchy(parentType: string, hierarchy: Record<string, Record<string, string[]>>) {
        return _(hierarchy)
            .mapValues((v, k) => {
                return `export const hierarchy_${parentType}_${k}: Partial<Record<${parentType},${k}[]>>={\n` + _(v).mapValues((sv, sk) => `    ["${sk}"]: [${sv.map(s => `"${s}"`).join(',')}]`).values().join(",\n") + `\n}`
            })
            .values()
            .join('\n')
    }


    // Start

    const objectProps: ExtractorObjectProp[] = (describe.fields || [])
        .map(v => ({
            ...fieldToName(v),
            ...fieldToType(v, describe)
        }));


    // scalar/many-to-one navigation props

    objectProps.push(
        ...(describe.fields || [])
            .filter(f => f.type === 'reference' && f.relationshipName)
            .map<ExtractorObjectProp>(v => ({
                ...fieldToName(v, true),
                typeName: _(v.referenceTo || [])
                    .map(r => getRefType(r))
                    .uniq()
                    .join(" | "),
                proxyType: 'standard'
            }))
    );


    // non-scalar/one-to-many navigation props            

    objectProps.push(
        ...(describe.childRelationships || [])
            .filter(v => v.relationshipName)
            .map<ExtractorObjectProp>(v => ({
                name: v.relationshipName || '__unknown__',
                readOnly: true,
                optional: false,
                typeName: getRefType(v.childSObject),
                proxyType: 'childTable'
            }))
    );


    return _([
        ..._(usedTypes).uniq().filter(t => t !== describe.name).map(t => `import { ${t} } from "./${t}";`).value(),
        `export const instance_${describe.name} = '${instance.toLowerCase().replace('https://', '').replace('http://', '')}';`,
        `export const object_prefix_${describe.name} = '${describe.keyPrefix}';`,
        !dateTypes.length ? '' : `export const date_types_${describe.name}_array = [\n    "${dateTypes.join(`",\n    "`)}"\n] as const;\n\nexport type Date_Types_${describe.name} = (typeof date_types_${describe.name}_array)[number];`,
        ..._(picklistArrays).mapValues((v, k) => `export const ${k}_array = [${v}  \n] as const;`).values().value(),
        ..._(recordTypeConstants).mapValues((v, k) => `export const RecordType_${k} = '${v}';`).values().value(),
        ..._(picklistTypes).mapValues((v, k) => `export type ${k} = ${v};`).values().value(),
        ..._(picklistMaps).mapValues(renderPicklistMap).values().value(),
        ..._(picklistHierarchies).mapValues((v, k) => renderPicklistHierarchy(k, v)).values().value(),
        `export interface ${describe.name} {\n${objectProps.map(renderInterfaceProp).join('\n')}  \n}`
    ]).compact().join('\n\n');


}