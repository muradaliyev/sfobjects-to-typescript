
//import { SfObjects } from "../interfaces";

//import { OBJ_CONFIG, SfObjectConfig } from "./interfaces";
import { Account } from "./interfaces/Account";
import { frm_Allocation__c } from "./interfaces/frm_Allocation__c";
import { frm_Grant__c } from "./interfaces/frm_Grant__c";
import { RecordType } from "./interfaces/RecordType";
import { isPlainObject } from "./utils";

type SfPrimitiveType = string | number | boolean | bigint;
type ChildTable<O> = { totalSize: number, done: boolean, records: O[] }

type GetObjectTypes<OI> = { [K in keyof OI]: OI[K] }[keyof OI];

// selection

type SelectStm<OO, O, K> = { from: K, select: PropSelect<OO, O>[] } // select must point to further generic type, otherwise will give recursive error

type PropSelect<OO, O> = {
    [K in keyof O]:
    NonNullable<O[K]> extends SfPrimitiveType ? K :
    NonNullable<O[K]> extends ChildTable<OO> ? SelectStm<OO, NonNullable<O[K]>['records'][0], K> :
    NonNullable<O[K]> extends OO ? SelectStm<OO, NonNullable<O[K]>, K> :
    never
}[keyof O]


type RootSelect<OI> = { [N in keyof OI]: { from: N, select: PropSelect<GetObjectTypes<OI>, OI[N]>[] } }[keyof OI];


// projection

type SelectProjKeys<S, O> = { [K in keyof O]: K extends S ? K : S extends { from: K } ? K : never }[keyof O]

type WrapNull<T> = T extends null ? null : never;

type SelectProj<S, O, OO> = {
    [K in SelectProjKeys<S, O>]: WrapNull<O[K]> | (
        S extends K ? O[K] : (
            S extends { from: K, select: any[] } ? (
                NonNullable<O[K]> extends OO ? SelectProj<S['select'][0], NonNullable<O[K]>, OO> : (
                    NonNullable<O[K]> extends ChildTable<OO> ? ChildTable<SelectProj<S['select'][0], NonNullable<O[K]>['records'][0], OO>> :
                    never
                )
            ) : never
        )
    )
}

type RootSelectProj<OI, Q extends RootSelect<OI>> = SelectProj<Q['select'][0], OI[Q['from']], GetObjectTypes<OI>>

// where

// Where

const OP_KEY_AND = '__and';
const OP_KEY_OR = '__or';
const OP_KEY_NOT = '__not';

const OP_KEYS_EQ = ['eq', 'equals', '=', '=='] as const;
const OP_KEYS_NE = ['ne', '!=', '<>'] as const;
const OP_KEYS_LT = ['lt', '<', 'less than'] as const;
const OP_KEYS_LTE = ['lte', '<=', 'less than or equal'] as const;
const OP_KEYS_GT = ['gt', '>', 'greater than'] as const;
const OP_KEYS_GTE = ['gte', '>=', 'greater than or equal'] as const;
const OP_KEYS_IN = ['in'] as const;
const OP_KEYS_NIN = ['nin', 'not in'] as const;
const OP_KEYS_LIKE = ['like'] as const;
const OP_KEYS_NLIKE = ['nlike', 'not like'] as const;

const SINGULAR_OP_KEYS = [
    ...OP_KEYS_EQ,
    ...OP_KEYS_NE,
    ...OP_KEYS_LT,
    ...OP_KEYS_GT,
    ...OP_KEYS_LTE,
    ...OP_KEYS_GTE,
    ...OP_KEYS_LIKE,
    ...OP_KEYS_NLIKE
] as const;

const PLURAL_OP_KEYS = [
    ...OP_KEYS_IN,
    ...OP_KEYS_NIN
] as const;

const LOGICAL_OP_KEYS = [
    OP_KEY_AND,
    OP_KEY_OR,
    OP_KEY_NOT
] as const;

type SfSingularOpKeys = typeof SINGULAR_OP_KEYS[number];
type SfPluralOpKeys = typeof PLURAL_OP_KEYS[number];
type SfLogicalOpKeys = typeof LOGICAL_OP_KEYS[number];
type SfValueOpKeys = SfSingularOpKeys | SfPluralOpKeys;

interface SfOpRule {
    ops: readonly SfValueOpKeys[];
    isNot?: boolean;
    isPlural?: boolean;
    soqlOp: string;
}

const OP_RULES: SfOpRule[] = [
    { ops: OP_KEYS_EQ, soqlOp: '=' },
    { ops: OP_KEYS_NE, soqlOp: '!=' },
    { ops: OP_KEYS_LT, soqlOp: '<' },
    { ops: OP_KEYS_LTE, soqlOp: '<=' },
    { ops: OP_KEYS_GT, soqlOp: '>' },
    { ops: OP_KEYS_GTE, soqlOp: '>=' },
    { ops: OP_KEYS_IN, soqlOp: 'in', isPlural: true },
    { ops: OP_KEYS_NIN, soqlOp: 'in', isNot: true, isPlural: true },
    { ops: OP_KEYS_LIKE, soqlOp: 'like' },
    { ops: OP_KEYS_NLIKE, soqlOp: 'like', isNot: true },
]

export interface SfWhereOp<OP extends SfValueOpKeys, V> { op: OP; value: V; }

type WhereProps<OO, O extends OO> = {
    [K in keyof O]+?: (
        NonNullable<O[K]> extends SfPrimitiveType ? (
            O[K] | O[K][] | { [OPK in SfSingularOpKeys]: SfWhereOp<OPK, O[K]> }[SfSingularOpKeys] | { [OPK in SfPluralOpKeys]: SfWhereOp<OPK, O[K][]> }[SfPluralOpKeys]
        ) : (
            NonNullable<O[K]> extends OO ? WhereProps<OO, NonNullable<O[K]>> : never
        )
    )
} | { [K in SfLogicalOpKeys]+?: WhereProps<OO, O> } | WhereProps<OO, O>[];


type RootWhere<OI> = { [N in keyof OI]: { from: N, where: WhereProps<GetObjectTypes<OI>, OI[N]> } }[keyof OI];


// Basic Client

function escapeVal(v: any): string {


    if (typeof v === 'string') {
        return `'${v}'`;
    }

    // if (isPlainDate(v)) {
    //     return v.toJSON();
    // }

    // if (isZonedDateTime(v)) {

    //     return (v
    //         .toInstant()
    //         .toString({
    //             smallestUnit: "millisecond",
    //             fractionalSecondDigits: 3,
    //         })
    //         .replace("Z", "+0000"));
    // }

    // if (isPlainTime(v)) {
    //     return v.toJSON();
    // }

    if (typeof v === 'boolean' || typeof v === 'number' || typeof v === 'bigint') {
        return String(v);
    }

    if (v === null) {
        return 'null';
    }

    throw `Unupported value type for where statement`;

}
/*
function processWhereStatement(
    where: Record<string, any>,
    cfg: Record<string, SfObjectConfig>,
    o?: { prefixes?: string[], isLogicalOr?: boolean, isLogicalNot?: boolean }
) {

    const { prefixes, isLogicalNot, isLogicalOr } = o || {};

    const whereStatements = Object.keys(where)
        .map((k): (string | undefined) => {

            const v = where[k];

            if (LOGICAL_OP_KEYS.includes(k as any)) {

                if (isPlainObject(v)) {
                    return processWhereStatement(v, cfg, { prefixes, isLogicalOr: (k === OP_KEY_OR), isLogicalNot: (k === OP_KEY_NOT) });
                }
            }

            else {

                const keyWithPrefix = [...(prefixes || []), k].join('.');

                if (isPlainObject(v)) {

                    const { op, value, ...rest } = v;

                    if (op !== undefined && value !== undefined) {

                        const opRule = OP_RULES.find(r => r.ops.some(rop => (rop === op)));

                        if (opRule) {

                            const { soqlOp, isNot, isPlural } = opRule;

                            if ((isPlural ?? false) === Array.isArray(value)) {


                                return [
                                    isNot ? 'not (' : '',
                                    keyWithPrefix,
                                    soqlOp,
                                    Array.isArray(value) ? `(${value.map(v => escapeVal(v)).join(',')})` : escapeVal(value),
                                    isNot ? ')' : '',
                                ]
                                    .filter(Boolean)
                                    .join(' ');
                            }
                        }
                    }

                    else if (op === undefined && value === undefined) {
                        return processWhereStatement(rest, cfg, { prefixes: [...(prefixes || []), k] })
                    }

                }
                else if (Array.isArray(v)) {
                    return `${keyWithPrefix} in (${v.map(vj => escapeVal(vj)).join(',')})`;
                }
                else {
                    return `${keyWithPrefix} = ${escapeVal(v)}`;
                }
            }
        })
        .filter(Boolean);


    if (whereStatements.length) {

        const joinedStatements = `(${whereStatements.join(isLogicalOr ? ') or (' : ') and (')})`;

        if (isLogicalNot) {
            return whereStatements.length > 1 ? `not (${joinedStatements})` : `not ${joinedStatements}`;
        }

        return joinedStatements;
    }
}


function constructWhereStatement(cfg: Record<string, SfObjectConfig>, where?: string | Record<string, any>) {

    if (where) {

        if (typeof where === 'string') {
            return where;
        }

        const whereSt = processWhereStatement(where, cfg);

        if (whereSt?.length) {
            return `where ${whereSt}`;
        }
    }
}


class BasicClient<OI extends {}> {

    constructor(private cfg: Record<string, SfObjectConfig>) { }

    testFunc<Q extends RootSelect<OI>>(q: Q) {
        return q as any as RootSelectProj<OI, Q>;
    }

    testWhere<Q extends RootWhere<OI>>(q: Q) {
        return q;
    }
}


type SfObjects = {
    'frm_Allocation__c': frm_Allocation__c,
    'frm_Grant__c': frm_Grant__c,
    'Account': Account,
    'RecordType': RecordType
}


const testCl = new BasicClient<SfObjects>(OBJ_CONFIG);

const ww = testCl.testWhere(
    {
        'from': 'frm_Grant__c',
        where: {
            'Stage__c': 'GSSC Review',
            'Active__c': {
                'op': '==',
                'value': true
            },
            'Account_Donor_Name__r': {
                'Account_Category__c': 'Corporate'
            },
            '__and': {
                'Active__c': [true, null]
            }
        }
    }
)


const tt = testCl.testFunc({
    from: 'frm_Grant__c',
    select: [
        'Id',
        'Active__c',
        'Stage__c',
        {
            'from': 'Account_Donor_Name__r',
            select: [
                'AccountNumber',
                'AccountSource'
            ]
        },
        {
            from: 'Allocations__r',
            select: [
                'Amendment__c'
            ]
        },
        {
            from: 'Mother_Grant__r',
            select: [
                'Active__c',
                'Stage__c'
            ]
        }
    ]
})

tt.Allocations__r?.records[0].Amendment__c




//OI extends SfObjectsIndex, N extends keyof OI*/