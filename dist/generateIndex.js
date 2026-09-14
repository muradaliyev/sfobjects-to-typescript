"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateIndex = generateIndex;
const utils_1 = require("./utils");
function generateIndex(describes, recTypeDevNames, instance, client) {
    const constValues = Object.keys(describes)
        .map((t) => {
        function getTypeKeys(ft) {
            const keys = describes[t].fields.filter(f => f.type === ft).map(f => f.name);
            return keys.length ? `['${keys.join(`', '`)}']` : '[]';
        }
        function getLookupTypes() {
            const kv = (describes[t].fields || [])
                .filter(f => (f.type === 'reference' && !!f.relationshipName))
                .reduce((p, f, i) => (Object.assign(Object.assign({}, p), { [f.relationshipName || '']: (0, utils_1.uniq)(f.referenceTo || []).filter(rt => !!describes[rt]) })), {});
            return `{${Object.keys(kv).filter(k => (kv[k].length === 1)).map(k => `\n            '${k}': '${kv[k][0]}'`).join(',')}\n        }`;
        }
        function getChildTableTypes() {
            const kv = (describes[t].childRelationships || [])
                .filter(v => (!!v.relationshipName && !!describes[v.childSObject]))
                .reduce((p, f, i) => (Object.assign(Object.assign({}, p), { [f.relationshipName || '']: f.childSObject })), {});
            return `{${Object.keys(kv).filter(k => !!kv[k]).map(k => `\n            '${k}': '${kv[k]}'`).join(',')}\n        }`;
        }
        function getRecordTypes() {
            return `{${describes[t].recordTypeInfos.filter(i => !!recTypeDevNames[t][i.recordTypeId]).map(i => `\n            '${recTypeDevNames[t][i.recordTypeId]}': '${i.recordTypeId}'`).join(',')}\n        }`;
        }
        const _o = {
            objectPrefix: ` '${describes[t].keyPrefix || ''}'`,
            dateTypes: getTypeKeys('date'),
            dateTimeTypes: getTypeKeys('datetime'),
            timeTypes: getTypeKeys('time'),
            lookupTypes: getLookupTypes(),
            childTables: getChildTableTypes(),
            recordTypes: getRecordTypes()
        };
        return `\n    '${t}': {${Object.keys(_o).map(k => `\n        ${k}:${_o[k]}`).join(',')}\n    }`;
    });
    //`export const object_prefix_${describe.name} = '${describe.keyPrefix}';`,
    return [
        client ? `import { getSfObjects } from "sfobjects-basic-client";` : '',
        Object.keys(describes).map(t => `import { ${t} } from "./${t}";`).join('\n'),
        `export const SFOBJECTS_INSTANCE = '${instance}';`,
        `export const SFOBJECTS_CONFIG = {\n${constValues.join(',\n')}\n}`,
        `export type SfObjectsIndex = {\n${Object.keys(describes).map((t) => `    ['${t}']: ${t}`).join(',\n')}\n}`,
        `export type { ${Object.keys(describes).join(', ')} };`,
        client ? `export const getSfClient = getSfObjects<SfObjectsIndex>(SFOBJECTS_CONFIG)` : '',
    ].join('\n\n');
}
