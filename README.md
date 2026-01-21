# sfobjects-to-typescript

sfobjects-to-typescript is an NPM package that pulls Salesforce objects description and saves as Typescript interfaces.

## Installation

```bash
npm sfobjects-to-typescript
```

## Command-line Usage

```bash
npx sfobjects-to-typescript --username username --password password --output output_floder --objects Object1__c Object2__c
```

## Usage

```typescript
import { exctract } from sfobjects-to-typescript

await extract({        
    username: 'myuser',
    password: 'mypassword',    
    objects: ['Object1__c','Object2__c']
});

```

## Contributing

--

## License

[MIT](https://choosealicense.com/licenses/mit/)