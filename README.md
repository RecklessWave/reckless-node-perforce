reckless-node-perforce
=============

A simplified fork of node-perforce with vulnerable dependencies removed and fixed commands.

## Install

```sh
npm install reckless-node-perforce
```

## Example

```js
var p4 = require('reckless-node-perforce');

// create a new changelist
p4.changelist.create({description: 'hello world'}, function (err, changelist)
{
  if (err) return console.log(err);
  console.log('changelist:', changelist);
});

// view changelist info
p4.changelist.view({changelist: changelist}, function (err, view)
{
  if (err) return console.log(err);
  console.log(view);
});

// edit changelist 1234
p4.changelist.edit({changelist: 1234, description: 'hi world'}, function (err)
{
  if (err) return console.log(err);
});

// delete changelist 1234
p4.changelist.delete({changelist: 1234}, function (err)
{
  if (err) return console.log(err);
});

// add files into CL@1234
p4.add({changelist: 1234, filetype: 'binary', files: ['*.bin']}, function(err)
{
  if (err) return console.log(err);
});

// revert files
p4.revert({files: ['*.bin']}, function(err)
{
  if (err) return console.log(err);
});

// edit files
p4.edit({files: ['*.js']}, function(err)
{
  if (err) return console.log(err);
});
```

## Now also supporting await syntax - example:

```js

var p4 = require('reckless-node-perforce');

try
{
  // create a new changelist
  let changelist = await p4.awaitCommand('changelist.create', {description: 'Hello world!'});
  console.log(`Changelist is ${changelist}.`);
}
catch (err)
{
  return console.log(err);
}
```