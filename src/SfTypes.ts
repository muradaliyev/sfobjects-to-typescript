import { Account } from "./interfaces/Account";
import { frm_Allocation__c } from "./interfaces/frm_Allocation__c";
import { frm_Grant__c } from "./interfaces/frm_Grant__c";

export type BaseSfObjectsIndex = { [key: string]: BaseSfObject }

export type SfIndexValues<OM extends BaseSfObjectsIndex> = { [K in keyof OM]: OM[K] }[keyof OM];

export type SfPrimitiveType = string | number | boolean | bigint;

export type SfAllTypes = SfPrimitiveType | BaseSfObject | ChildTable<BaseSfObject> | null;

export type ChildTable<OT = BaseSfObject> = { totalSize: number, done: boolean, records: OT[] }

export type BaseSfObject = { [key: string]: SfAllTypes } & { readonly Id: string; }

export type StringKeysOnly<O> = O & { [key: string]: any }

export type NonNullableObject<O extends BaseSfObject> = { [K in keyof O]: NonNullable<O[K]> }[keyof O];

export type SfSelect<O extends BaseSfObject, OT extends BaseSfObject> = {
    [K in keyof O as NonNullable<O[K]> extends SfPrimitiveType ? K : NonNullable<O[K]> extends OT ? K : NonNullable<O[K]> extends ChildTable<OT> ? K : never]?:
    NonNullable<O[K]> extends SfPrimitiveType ? { type: 'pr' } :
    NonNullable<O[K]> extends OT ? { type: 'pa', select: SfSelect<NonNullable<O[K]>, OT> } :
    NonNullable<O[K]> extends ChildTable<OT> ? { type: 'ch', select: SfSelect<NonNullable<O[K]>['records'][0], OT> } :
    never
}



export type SfObjects = {
    'frm_Grant__c': StringKeysOnly<frm_Grant__c>,
    'frm_Allocation__c': StringKeysOnly<frm_Allocation__c>,
    'Account': StringKeysOnly<Account>
}

// type r<O extends BaseSfObjectsIndex> = {}

// type rr = r<SfObjects>;


const r: SfSelect<StringKeysOnly<frm_Grant__c>, StringKeysOnly<frm_Grant__c> | StringKeysOnly<frm_Allocation__c> | StringKeysOnly<Account>> = {

    'Additional_Details__c': {
        type: 'pr'
    },

    'Sponsor_Account__r': {
        'type': 'pa',
        select: {
            'Grants5__r':{
                'type':'ch',
                'select':{
                    'Active__c':{
                        'type':'pr'
                    }
                }
            }
            
        }
    },
    // 'Programmatic_Reviews__r': {
    //     'type': 'ch',
    //     select: {
    //         'Advance_Investment__c': {
    //             'type': 'pr'
    //         }
    //     }
    // }
}
