import { DescribeSObjectResult, FieldType } from "./DescribeResult";
import { uniq } from "./utils";

export function generateSimpleIndex(describes: Record<string, DescribeSObjectResult>, instance: string) {
    return [
        Object.keys(describes).map(t => `import { ${describes[t].name} } from "./${describes[t].name}";`).join('\n'),
        `export const SFOBJECTS_INSTANCE = '${instance.toLowerCase().replace('https://', '').replace('http://', '')}';`,
        `export type { ${Object.keys(describes).map(t => describes[t].name).join(', ')} };`
    ].join('\n\n')
}


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
                objectPrefix: `'${describes[t].keyPrefix || ''}'`,
                dateTypes: getTypeKeys('date'),
                dateTimeTypes: getTypeKeys('datetime'),
                timeTypes: getTypeKeys('time'),
                lookupTypes: getLookupTypes(),
                childTables: getChildTableTypes(),
                recordTypes: getRecordTypes()
            }

            return `\n    '${describes[t].name}': {${Object.keys(_o).map(k => `\n        ${k}: ${_o[k]}`).join(',')}\n    }`;
        })

    return [
        'import { GetObjectTypes, getSfObject, getSfObjects, ISfConnection, SfClientOptions, SfObjActions, sfObject, SfObjectActionsIndex, SfProjection, SfQueryResult, SfRootOrderBy, SfRootSelect, SfRootWhere } from "sfobjects-basic-client";',
        Object.keys(describes).map(t => `import { ${describes[t].name} } from "./${describes[t].name}";`).join('\n'),
        `export const SFOBJECTS_INSTANCE = '${instance.toLowerCase().replace('https://', '').replace('http://', '')}';`,
        `export const SFOBJECTS_CONFIG = {\n${constValues.join(',\n')}\n}`,
        `export type SfObjectsIndex = {\n${Object.keys(describes).map((t) => `    ['${describes[t].name}']: ${describes[t].name}`).join(',\n')}\n};`,
        'export type SfClientObject<N extends keyof SfObjectsIndex> = SfObjActions<SfObjectsIndex, N>;',
        'export type SfClientObjectsIndex = SfObjectActionsIndex<SfObjectsIndex>;',
        'export type SfClientSelect<N extends keyof SfObjectsIndex> = SfRootSelect<SfObjectsIndex, N>;',
        'export type SfClientWhere<N extends keyof SfObjectsIndex> = SfRootWhere<SfObjectsIndex, N>;',
        'export type SfClientOrderBy<N extends keyof SfObjectsIndex> = SfRootOrderBy<SfObjectsIndex, N>;',
        'export type SfClientSelectProjection<N extends keyof SfObjectsIndex, S extends SfRootSelect<SfObjectsIndex, N>> = SfProjection<GetObjectTypes<SfObjectsIndex>, SfObjectsIndex[N], S>;',
        'export type SfClientQueryResult<N extends keyof SfObjectsIndex, S extends SfRootSelect<SfObjectsIndex, N>> = SfQueryResult<SfProjection<GetObjectTypes<SfObjectsIndex>, SfObjectsIndex[N], S>>;',
        'export const getSfClientObject = <N extends keyof SfObjectsIndex>(n: N, conn: ISfConnection): SfClientObject<N> => getSfObject<SfObjectsIndex>(SFOBJECTS_CONFIG)(n, conn);',
        'export const getSfClientObjects = (conn: ISfConnection, options?: SfClientOptions): SfClientObjectsIndex => getSfObjects<SfObjectsIndex>(SFOBJECTS_CONFIG)(conn, options);',
        'export const sfClientObject = <N extends keyof SfObjectsIndex>(n: N) => sfObject<SfObjectsIndex, N>(SFOBJECTS_CONFIG, n);'
    ].join('\n\n')
}