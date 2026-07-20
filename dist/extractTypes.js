"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractTypes = extractTypes;
const utils_1 = require("./utils");
const TYPE_MAP = {
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
};
class Bitset {
    constructor(data) {
        this._data = data ? Buffer.from(data, 'base64') : new Uint8Array(0);
    }
    testBit(n) {
        return (this._data[n >> 3] & (0x80 >> (n % 8))) !== 0;
    }
    size() {
        return this._data.length * 8;
    }
}
function extractTypes(o) {
    const { describe, otherTypeNames: otherNames, recTypeDevNames, instance } = o;
    const usedTypes = [];
    const dateTypes = [];
    const dateTimeTypes = [];
    const timeTypes = [];
    const picklistTypes = {};
    const picklistArrays = {};
    const recordTypeConstants = {};
    const picklistMaps = {};
    const picklistHierarchies = {};
    function fieldToName(v, asRef) {
        var _a;
        if (!asRef) {
            if (v.name === 'RecordTypeId') {
                return {
                    name: v.name,
                    readOnly: false,
                    optional: false
                };
            }
            if (v.name === 'OwnerId') {
                return {
                    name: v.name,
                    readOnly: true,
                    optional: false
                };
            }
        }
        return {
            name: (v.type === 'reference' && asRef) ? (_a = v.relationshipName) !== null && _a !== void 0 ? _a : '__unknown__' : v.name,
            readOnly: (v.type === 'reference' && asRef) || !v.updateable,
            optional: v.nillable || v.type === 'boolean'
        };
    }
    function getRefType(t) {
        if (otherNames.some(on => on === t)) {
            usedTypes.push(t);
            return t;
        }
        return 'object';
    }
    function asChildTable(typeName) {
        return `{ totalSize: number, done: boolean, records: ${typeName}[] }`;
    }
    function asRecordType() {
        return `{ readonly Id: string, Name: string, DeveloperName: string, NamespacePrefix: string, Description: string }`;
    }
    function fieldToType(f, d) {
        var _a, _b;
        if (f.name === 'RecordTypeId') {
            const rtTypeName = `RecordType_${describe.name}`;
            picklistTypes[rtTypeName] = d.recordTypeInfos
                .map(i => {
                var _a;
                const devName = recTypeDevNames[i.recordTypeId];
                if (!devName) {
                    throw `Unable to identify dev name for record type [${i.recordTypeId}]`;
                }
                recordTypeConstants[devName] = i.recordTypeId;
                return `\n    typeof RecordType_${devName} /*${(_a = i.name) !== null && _a !== void 0 ? _a : devName}*/`;
            })
                .join(' | ');
            return {
                proxyType: 'standard',
                typeName: rtTypeName
            };
        }
        else if (f.type === 'picklist' || f.type === 'multipicklist' || f.type === 'combobox') {
            const plTypeName = `Picklist_${describe.name}_${f.name}`;
            picklistArrays[plTypeName] = (f.picklistValues || []).map(v => `\n    "${v.value}" /*${v.label}*/`).join(',');
            picklistTypes[plTypeName] = `(typeof ${plTypeName}_array)[number]`;
            if ((_a = f.picklistValues) === null || _a === void 0 ? void 0 : _a.some(v => (v.value !== v.label))) {
                picklistMaps[plTypeName] = (f.picklistValues || []).reduce((p, v, i) => { var _a; return (Object.assign(Object.assign({}, p), { [v.value]: (_a = v.label) !== null && _a !== void 0 ? _a : v.value })); }, {});
            }
            if (f.dependentPicklist && f.controllerName) {
                const controller = d.fields.find(cf => (cf.name === f.controllerName));
                if (!controller) {
                    throw `Unable to identify controller for field ${f.name}`;
                }
                const cTypeName = (controller.type === 'picklist' || controller.type === 'multipicklist' || controller.type === 'combobox') ? `Picklist_${describe.name}_${controller.name}` : TYPE_MAP[controller.type];
                picklistHierarchies[cTypeName] = picklistHierarchies[cTypeName] || {};
                picklistHierarchies[cTypeName][plTypeName] = picklistHierarchies[cTypeName][plTypeName] || {};
                for (const picklistValue of (f.picklistValues || [])) {
                    const validFor = new Bitset((_b = picklistValue.validFor) !== null && _b !== void 0 ? _b : '');
                    let vvf = []; // | undefined = undefined;
                    if (controller.type === 'picklist') {
                        for (let k = 0; k < validFor.size(); k++) {
                            if (validFor.testBit(k)) {
                                vvf.push((controller.picklistValues || [])[k].value);
                            }
                        }
                    }
                    else if (controller.type === 'boolean') {
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
            };
        }
        else {
            if (f.type === 'date') {
                dateTypes.push(f.name);
            }
            else if (f.type === 'datetime') {
                dateTimeTypes.push(f.name);
            }
            else if (f.type === 'time') {
                timeTypes.push(f.name);
            }
            return {
                typeName: TYPE_MAP[f.type],
                proxyType: 'standard'
            };
        }
    }
    function renderInterfaceProp(p) {
        return `  ${p.readOnly ? 'readonly ' : ''}${p.name} : ${(p.proxyType === 'multiPicklist' && 'string') || (p.proxyType === 'childTable' && asChildTable(p.typeName)) || p.typeName}${p.optional ? ' | null' : ''};`;
    }
    function renderPicklistMap(maps, name) {
        return `export const map_${name} : Record<${name},string>={\n${Object.keys(maps).map(k => '    ["' + k + '"] : "' + maps[k] + '"').join(`,\n`)}\n}`;
    }
    function renderPicklistHierarchy(parentType, hierarchy) {
        return Object.keys(hierarchy)
            .map((k) => {
            const v = hierarchy[k];
            return `export const hierarchy_${parentType}_${k}: Partial<Record<${parentType},${k}[]>>={\n` + Object.keys(v).map((sk) => `    ["${sk}"]: [${v[sk].map(s => `"${s}"`).join(',')}]`).join(",\n") + `\n}`;
        })
            .join('\n');
    }
    // function renderSpecialTypes(types: string[], constPrefix: string, typePrefix: string) {
    //     return !types.length ? '' : `export const ${constPrefix}_${describe.name}_array = [\n    "${types.join(`",\n    "`)}"\n] as const;\n\nexport type ${typePrefix}_${describe.name} = (typeof ${constPrefix}_${describe.name}_array)[number];`;
    // }
    // Start
    const objectProps = [];
    // data props
    objectProps.push(...(describe.fields || [])
        .map(v => (Object.assign(Object.assign({}, fieldToName(v)), fieldToType(v, describe)))));
    // scalar/many-to-one navigation props
    objectProps.push(...(describe.fields || [])
        .filter(f => f.type === 'reference' && f.relationshipName)
        .map(v => (Object.assign(Object.assign({}, fieldToName(v, true)), { typeName: (0, utils_1.uniq)((v.referenceTo || []).map(r => getRefType(r))).join(" | "), proxyType: 'standard' }))));
    // non-scalar/one-to-many navigation props            
    objectProps.push(...(describe.childRelationships || [])
        .filter(v => v.relationshipName)
        .map(v => ({
        name: v.relationshipName || '__unknown__',
        readOnly: true,
        optional: true,
        typeName: getRefType(v.childSObject),
        proxyType: 'childTable'
    })));
    return [
        ...(0, utils_1.uniq)(usedTypes).filter(t => t !== describe.name).map(t => `import { ${t} } from "./${t}";`),
        `export const instance_${describe.name} = '${instance.toLowerCase().replace('https://', '').replace('http://', '')}';`,
        `export const object_prefix_${describe.name} = '${describe.keyPrefix}';`,
        // renderSpecialTypes(dateTypes, 'date_types', 'Date_Types'),
        // renderSpecialTypes(dateTimeTypes, 'date_time_types', 'Date_Time_Types'),
        // renderSpecialTypes(timeTypes, 'time_types', 'Time_Types'),
        ...Object.keys(picklistArrays).map(k => `export const ${k}_array = [${picklistArrays[k]}  \n] as const;`),
        ...Object.keys(recordTypeConstants).map(k => `export const RecordType_${k} = '${recordTypeConstants[k]}';`),
        ...Object.keys(picklistTypes).map(k => `export type ${k} = ${picklistTypes[k]};`),
        ...Object.keys(picklistMaps).map(k => renderPicklistMap(picklistMaps[k], k)),
        ...Object.keys(picklistHierarchies).map(k => renderPicklistHierarchy(k, picklistHierarchies[k])),
        `export interface ${describe.name} {\n${objectProps.map(renderInterfaceProp).join('\n')}  \n}`
    ].filter(Boolean).join('\n\n');
}
