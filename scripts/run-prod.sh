#!/bin/bash

forward_signals() {
  kill -s SIGTERM "$node_pid" 2>/dev/null
  wait "$node_pid" 2>/dev/null
}

if ! [ -x "$(command -v node)" ]; then
  echo 'Error: node.js is not installed.' >&2
  exit 1
fi

if ! [ -x "$(command -v npm)" ]; then
  echo 'Error: npm is not installed.' >&2
  exit 1
fi

if ! [ -x "$(command -v yarn)" ]; then
  echo 'Error: yarn is not installed.' >&2
  exit 1
fi

if [ ! -f package.json ]; then
  echo 'Error: package.json does not exist.' >&2
  exit 1
fi

node dist/index.js -e production &
NODE_PID=$!

echo "Started Node.js (PID $NODE_PID)"

trap forward_signals SIGTERM SIGINT

wait "$NODE_PID"
