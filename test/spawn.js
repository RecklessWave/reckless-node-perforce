'use strict';

const assert = require('assert');
const childProcess = require('child_process');
const { EventEmitter } = require('events');
const { PassThrough, Writable } = require('stream');

const originalSpawn = childProcess.spawn;
const calls = [];

childProcess.spawn = function (command, args, options)
{
  const child = new EventEmitter();
  const stdinChunks = [];

  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.stdin = new Writable({
    write(chunk, encoding, callback)
    {
      stdinChunks.push(chunk.toString());
      callback();
    }
  });

  calls.push({ command, args, options, stdinChunks });

  process.nextTick(function ()
  {
    if (args.includes('--simulate-failure'))
    {
      child.stderr.end('simulated failure');
      child.emit('close', 7);
      return;
    }

    child.stdout.end('simulated output');
    child.emit('close', 0);
  });

  return child;
};

const p4 = require('../index');
childProcess.spawn = originalSpawn;

function invoke(command, options)
{
  return new Promise(function (resolve)
  {
    p4[command](options, function (error, output)
    {
      resolve({ error, output });
    });
  });
}

async function main()
{
  const success = await invoke('sync', {
    cwd: process.cwd(),
    shell: true,
    force: true,
    files: ['//depot/audio/file.wav']
  });

  assert.ifError(success.error);
  assert.strictEqual(success.output, 'simulated output');
  assert.strictEqual(calls[0].command, process.platform === 'win32' ? 'p4.exe' : 'p4');
  assert.deepStrictEqual(calls[0].args, ['sync', '-f', '//depot/audio/file.wav']);
  assert.strictEqual(calls[0].options.cwd, process.cwd());
  assert.strictEqual(Object.prototype.hasOwnProperty.call(calls[0].options, 'shell'), false);

  const login = await invoke('login', { password: 'ticket-value' });
  assert.ifError(login.error);
  assert.deepStrictEqual(calls[1].args, ['login']);
  assert.strictEqual(calls[1].stdinChunks.join(''), 'ticket-value\n');

  const failure = await invoke('sync', { custom: '--simulate-failure' });
  assert.strictEqual(failure.output, undefined);
  assert.strictEqual(failure.error.code, 7);
  assert.strictEqual(failure.error.stderr, 'simulated failure');
  assert.strictEqual(failure.error.stdout, '');
  assert.match(failure.error.message, /simulated failure/);

  const rejectedError = await p4.awaitCommand('sync', { custom: '--simulate-failure' })
    .then(function () { return null; }, function (error) { return error; });
  assert.ok(rejectedError instanceof Error);
  assert.strictEqual(rejectedError.code, 7);
  assert.strictEqual(rejectedError.stderr, 'simulated failure');

  console.log('spawn argument, stdin, and callback behavior passed');
}

main().catch(function (error)
{
  console.error(error);
  process.exitCode = 1;
});
