'use strict';

module.exports = {
  _change: {
    cmd: 'Change:',
    type: String,
    category: 'stdin'
  },
  password: {
    cmd: '',
    type: String,
    category: 'stdin',
    omit_i: true
  },
  description: {
    cmd: 'Description:',
    type: String,
    category: 'stdin'
  },
  acceptmerged: {
    cmd: '-am',
    category: 'unary'
  },
  delete: {
    cmd: '-d',
    category: 'unary'
  },
  changelist: {
    cmd: '-c',
    type: Number,
    category: 'mixed'
  },
  shelved: {
    cmd: '-s',
    type: Number,
    category: 'mixed'
  },
  stream: {
    cmd: '-S',
    type: String,
    category: 'mixed'
  },
  filetype: {
    cmd: '-t',
    type: String,
    category: 'mixed'
  },
  _delete: {
    cmd: '-d',
    type: Number,
    category: 'mixed'
  },
  _output: {
    cmd: '-o',
    type: String,
    category: 'mixed'
  },
  force: {
    cmd: '-f',
    category: 'unary'
  },
  switch: {
    cmd: '-s',
    category: 'unary'
  },
  unchanged: {
    cmd: '-a',
    category: 'unary'
  },
  quiet: {
    cmd: '-q',
    category: 'unary'
  },
  branch: {
    cmd: '-b',
    type: String,
    category: 'mixed'
  },
  files: {
    type: Array,
    category: 'mixed'
  },
  max: {
    cmd: '-m',
    type: Number,
    category: 'mixed'
  },
  client: {
    cmd: '-c',
    type: String,
    category: 'mixed'
  },
  long: {
    cmd: '-l',
    category: 'unary'
  },
  trunk: {
    cmd: '-L',
    category: 'unary'
  },
  status: {
    cmd: '-s',
    type: String,
    category: 'mixed'
  },
  time: {
    cmd: '-t',
    category: 'unary'
  },
  user: {
    cmd: '-u',
    type: String,
    category: 'mixed'
  },
  custom: {
    cmd: ' ',
    type: String,
    category: 'mixed'
  }
};
