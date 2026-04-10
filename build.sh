#!/bin/bash
file1=$(head -n 1 .testregistry)
tag=$2
file=$1
if [[ "$file1" ]]
then
  echo 'personal registry set'
  registry="${file1%%[[:cntrl:]]}"
else
  registry="ghcr.io"
  echo "using ghcr.io for test build"
fi
container="${registry}/${tag}"
echo building $container
docker build -f $file -t $container .
docker push $container
