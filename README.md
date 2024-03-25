reckless-node-perforce
=============

A simplified fork of node-perforce with vulnerable dependencies removed and fixed commands.

## Install

```sh
npm install reckless-node-perforce
```

## Examples using callback syntax:

```js
var p4 = require('reckless-node-perforce');

// create a new changelist
p4.changelist.create({description: 'hello world'}, function (err, changelist)
{
  if (err) return console.log(err);
  console.log('changelist:', changelist);
});

// revert files
p4.revert({files: ['*.bin']}, function(err)
{
  if (err) return console.log(err);
});
```

## Now also supporting simpler await syntax - more examples:

```js
var p4 = require('reckless-node-perforce');

try
{
  // create a new changelist
  let changelist = await p4.awaitCommand('changelist.create', {description: 'Hello world!'});
  console.log(`Changelist is ${changelist}.`);

  // view changelist info
  let info = await p4.awaitCommand('changelist.view', {changelist: changelist});

  // edit changelist 1234
  let editResult = await p4.awaitCommand('changelist.edit', {changelist: 1234, description: 'Hello world'});

  // delete changelist 1234
  let deleteResult = await p4.awaitCommand('changelist.delete', {changelist: 1234});

  // add files to changelist 1234
  let addResult = await p4.awaitCommand('add', {changelist: 1234, filetype: 'binary', files: ['*.bin']});

  // check out files
  let editResult = await p4.awaitCommand('edit', {files: ['*.js']});
}
catch (err)
{
  return console.log(err);
}
```

## Important note on how to use Perforce command options

To understand how to construct standard Perforce commands using this library's syntax, look at the option translations listed in the p4options.js file. Below is a list of those Perforce options followed by the options object format needed to use them in this library as parameters for your Perforce commands.

Unary options (no value needed) should simply have a value of true when you pass them. Other options show the value type that is expected, e.g. changelists are expected to be provided as Numbers, not Strings.

```
-am: {acceptmerged: true}
 -d: {delete: true}
 -c: {changelist: NumberValue}
 -s: {shelved: NumberValue}
 -S: {stream: StringValue}
 -t: {filetype: StringValue}
 -f: {force: true}
 -s: {switch: true}
 -a: {unchanged: true}
 -m: {max: NumberValue}
 -c: {client: StringValue}
 -l: {long: true}
 -L: {trunk: true}
 -s: {status: StringValue}
 -t: {time: true}
 -u: {user: StringValue}
 '': {custom: StringValue}      (any provided string will be appended to the initial command)
     {files: [StringValues]}    (provided array of file paths as string values will be used for the command)
     {description: StringValue} (description will be inserted for the new or edited changelist using stdin)
```

## Debugging:

A debug option has been added to make it easier to see what commands are being run. Its output looks like this:

```
[P4 DEBUG] p4.exe edit -c 109 -t text //depot/MyFileName.json
```

To use it, simply call `p4.setDebugMode(true)` after requiring the library. You will see debug info logged to console in this format:

```js
var p4 = require('reckless-node-perforce');

p4.setDebugMode(true);
```
