'use strict';

var os = require('os');
var exec = require('child_process').exec;
var p4options = require('./p4options');
const { stdout } = require('process');
var ztagRegex = /^\.\.\.\s+(\w+)\s+(.+)/;

var p4 = process.platform === 'win32' ? 'p4.exe' : 'p4';

function camelize(str)
{
  return str
  .split(/[-_\s]+/) // Split by dash, underscore, or space
  .map((word, index) => 
    index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  )
  .join('');
}

// Build a list of options/arguments for the p4 command
function optionBuilder(options)
{
  options = options || {};

  var results = { stdin: [], args: [], files: [] };
  Object.keys(options).map(function (option)
  {
    var p4option = p4options[option];

    if (!p4option) return;
    if (p4option.category !== 'unary')
    {
      if ((options[option] || {}).constructor !== p4option.type)
      {
        if (NodeP4.debug_mode)
        {
          console.log(`[P4 DEBUG] Rejected option parameter due to wrong argument type! Option ${option}, parameter value was ${options[option]}, required type was ${p4option.type.name}.`);
        }
        throw new Error(`[Perforce] Rejected option parameter due to wrong argument type! Option ${option}, parameter value was ${options[option]}, required type was ${p4option.type.name}.`);
        return;
      }
    }
    if (p4option.category === 'stdin')
    {
      results.stdin.push(p4option.cmd + options[option]);
      if (results.args.indexOf('-i') < 0 && !p4option.omit_i) results.args.push('-i');
    }
    else if (p4option.cmd)
    {
      results.args.push(p4option.cmd);
      if (p4option.category === 'mixed') results.args.push(options[option]);
    }
    else
    {
      results.files = results.files.concat(options[option]);
    }
  });

  return results;
}

// Filter passed-in options to get a hash of child process options (i.e., not p4 command arguments)
function execOptionBuilder(options)
{
  var validKeys =
  {
    cwd: true,
    env: true,
    encoding: true,
    shell: true,
    timeout: true,
    maxBuffer: true,
    killSignal: true,
    uid: true,
    gid: true
  };

  options = options || {};

  return Object.keys(options).reduce(function (result, key)
  {
    if (validKeys[key])
    {
      result[key] = options[key];
    }
    return result;
  }, {});
}

function execP4(p4cmd, options, callback)
{
  if (typeof options === 'function')
  {
    callback = options;
    options = undefined;
  }

  var ob = optionBuilder(options);
  var childProcessOptions = execOptionBuilder(options);
  var cmd = [p4, p4cmd, ob.args.join(' '), ob.files.join(' ')];

  if (NodeP4.debug_mode)
  {
    console.log('[P4 DEBUG] ' + cmd.join(' '));
  }
  
  var child = exec(cmd.join(' '), childProcessOptions, function (err, stdout, stderr)
  {
    if (err) return callback(err);
    if (stderr) return callback(new Error(stderr));
    return callback(null, stdout);
  });

  if (ob.stdin.length > 0)
  {
    ob.stdin.forEach(function (line)
    {
      // for multi-line inputs, the first line goes in as is, and the following need to start with a tab
      let multiline = line.split('\n')
      child.stdin.write(multiline[0] + '\n');

      if (NodeP4.debug_mode && p4cmd.toLowerCase() != 'login')
      {
        console.log("     > " + multiline[0]);
      }

      multiline.shift();
      multiline.forEach(function (theLine)
      {
        child.stdin.write('\t' + theLine + '\n');

        if (NodeP4.debug_mode && p4cmd.toLowerCase() != 'login')
        {
          console.log('     >      ' + theLine);
        }
      });
    });

    child.stdin.end();
  }
}

// Process group of lines of output from a p4 command executed with -ztag
function processZtagOutput(output)
{
  return output.split('\n').reduce(function (memo, line)
  {
    var match, key, value;
    match = ztagRegex.exec(line);
    if (match)
    {
      key = match[1];
      value = match[2];
      memo[key] = value;
    }
    return memo;
  }, {});
}

function NodeP4() {}

NodeP4.prototype.changelist =
{
  create: function (options, callback)
  {
    if (typeof options === 'function')
    {
      callback = options;
      options = undefined;
    }
    var newOptions =
    {
      _change: 'new',
      description: options.description || '<saved by node-perforce>'
    };
    execP4('change', newOptions, function (err, stdout)
    {
      if (err) return callback(err);
      var matched = stdout.match(/([0-9]+)/g);
      if (matched.length > 0) return callback(null, parseInt(matched[0], 10));
      else return callback(new Error('Unknown error'));
    });
  },

  edit: function (options, callback)
  {
    callback = callback || function () { };

    if (!options || !options.changelist) return callback(new Error('Missing parameter/argument'));

    if (!options.description) return callback();

    var newOptions =
    {
      _change: options.changelist.toString(),
      description: options.description
    };

    execP4('change', newOptions, function (err)
    {
      if (err) return callback(err);
      return callback();
    });
  },

  delete: function (options, callback)
  {
    callback = callback || function () { };
    if (!options || !options.changelist) return callback(new Error('Missing parameter/argument'));

    execP4('change', { _delete: options.changelist }, function (err)
    {
      if (err) return callback(err);
      return callback();
    });
  },

  view: function (options, callback)
  {
    if (!options || !options.changelist) return callback(new Error('Missing parameter/argument'));
    execP4('change', { _output: options.changelist }, function (err, stdout)
    {
      if (err) return callback(err);

      // preprocessing file status
      stdout = stdout.replace(/(\t)+#(.)*/g, function (match)
      {
        return '@@@' + match.substring(3);
      });

      var result = {};
      var lines = stdout.replace(/#(.)*\n/g, '').split(os.EOL + os.EOL);
      lines.forEach(function (line)
      {
        var key = camelize(line.split(':')[0].toLowerCase().trim());
        if (key)
        {
          result[key] = line.substring(line.indexOf(':') + 1).trim();
        }
      });

      if (result.files)
      {
        result.files = result.files.split('\n').map(function (file)
        {
          var file = file.replace(/\t*/g, '').split('@@@');
          return { file: file[0], action: file[1] };
        });
      }
      else
      {
        result.files = [];
      }

      return callback(null, result);
    });
  },
  
  submit: function (options, callback)
  {
    if (!options || !options.changelist) return callback(new Error('Missing parameter/argument'));
    execP4('submit', options, function (err, stdout)
    {
      if (err) return callback(err);
    });
  }
};

NodeP4.prototype.info = function (options, callback)
{
  if (typeof options === 'function')
  {
    callback = options;
    options = undefined;
  }

  execP4('info', options, function (err, stdout)
  {
    if (err) return callback(err);

    var result = {};

    stdout.split(/\r\n|\r|\n/).forEach(function (line)
    {
      if (!line) return;
      var key = camelize(line.split(':')[0].toLowerCase());
      result[key] = line.substring(line.indexOf(':') + 1).trim();
    });
    callback(null, result);
  });
};

// Return an array of file info objects for each file opened in the workspace
NodeP4.prototype.opened = function (options, callback)
{
  if (typeof options === 'function')
  {
    callback = options;
    options = undefined;
  }

  execP4('-ztag opened', options, function (err, stdout)
  {
    var result;
    if (err) return callback(err);

    // process each file
    result = stdout.trim().split(/\r\n\r\n|\n\n/).reduce(function (memo, fileinfo)
    {
      // process each line of file info, transforming into a hash
      memo.push(processZtagOutput(fileinfo));
      return memo;
    }, []);

    callback(null, result);
  });
};

NodeP4.prototype.fstat = function (options, callback)
{
  if (typeof options === 'function')
  {
    callback = options;
    options = undefined;
  }

  execP4('fstat', options, function (err, stdout)
  {
    var result;
    if (err) return callback(err);

    // process each file fstat info
    result = stdout.trim().split(/\r\n\r\n|\n\n/).reduce(function (memo, fstatinfo)
    {
      // process each line of file info, transforming into a hash
      memo.push(processZtagOutput(fstatinfo));
      return memo;
    }, []);

    callback(null, result);
  });
};

NodeP4.prototype.changes = function (options, callback)
{
  if (typeof options === 'function')
  {
    callback = options;
    options = undefined;
  }

  execP4('-ztag changes', options, function (err, stdout)
  {
    var result;
    if (err) return callback(err);

    // process each change
    result = stdout.trim().split(/\r\n\r\n|\n\n(?=\.\.\.)/).reduce(function (memo, changeinfo)
    {
      // process each line of change info, transforming into a hash
      var item = processZtagOutput(changeinfo);

      // If object representing change is not empty, push it onto array
      if (Object.keys(item).length != 0)
      {
        memo.push(item);
      }

      return memo;
    }, []);

    callback(null, result);
  });
};

NodeP4.prototype.user = function (options, callback)
{
  if (typeof options === 'function')
  {
    callback = options;
    options = undefined;
  }

  execP4('-ztag user', options, function (err, stdout)
  {
    var result;
    if (err) return callback(err);

    // process ztagged user information
    result = processZtagOutput(stdout.trim());

    callback(null, result);
  });
};

NodeP4.prototype.users = function (options, callback)
{
  if (typeof options === 'function')
  {
    callback = options;
    options = undefined;
  }
  execP4('-ztag users', options, function (err, stdout)
  {
    var result;
    if (err) return callback(err);

    // process each change
    result = stdout.trim().split(/\r\n\r\n|\n\n(?=\.\.\.)/).reduce(function (memo, userinfo)
    {
      // process each line of user info, transforming into a hash
      memo.push(processZtagOutput(userinfo));
      return memo;
    }, []);

    callback(null, result);
  });
};

NodeP4.prototype.diff2 = function (options, callback)
{
  if (typeof options === 'function')
  {
    callback = options;
    options = undefined;
  }

  // TODO: Check that no more than two file arguments are provided
  execP4('-ztag diff2', options, function (err, stdout)
  {
    var result;
    if (err) return callback(err);

    // process each change
    result = stdout.trim().split(/\r\n\r\n|\n\n(?=\.\.\.)/).reduce(function (memo, diff2info)
    {
      // process each line of change info, transforming into a hash
      var item = processZtagOutput(diff2info);

      // If object representing change is not empty, push it onto array
      if (Object.keys(item).length != 0)
        memo.push(item);

      return memo;
    }, []);

    callback(null, result);
  });
};

NodeP4.prototype.awaitCommand = function (command, options)
{
  return new Promise((resolve, reject) =>
  {
    let commandPointer = this;

    if (command.includes('.'))
    {
      commandPointer = this[command.substring(0, command.indexOf('.'))];
      command = command.substring(command.indexOf('.') + 1);
    }

    commandPointer[command](options, (err, out) =>
    {
      // Error and output handling
      if (err)
      {
        if (err.message && err.message.includes("file(s) up-to-date"))
        {
          resolve(err.message); // Not a real error, treat as success
        }
        else
        {
          reject(err); // Real error, reject the promise
        }
      }
      else
      {
        resolve(out); // No errors, resolve with the actual output
      }
    });
  });
};

NodeP4.prototype.setDebugMode = function (debug_active)
{
  // change static property so that we can access it inside nested function defs like changelist.create,
  // where we can't easily get an instance property using the 'this' variable since the context is nested
  NodeP4.debug_mode = debug_active;
};

var commonCommands = ['add', 'delete', 'edit', 'revert', 'sync', 'diff', 'reconcile', 'reopen', 'resolved',
                      'shelve', 'unshelve', 'client', 'resolve', 'submit', 'describe', 'files', 'have', 'login', 'logout'];

commonCommands.forEach(function (command)
{
  NodeP4.prototype[command] = function (options, callback)
  {
    execP4(command, options, callback);
  };
});

module.exports = new NodeP4();