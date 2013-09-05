rm -f js/*
# for mac
while sleep 1 ; do
  coffee -b -c -o js/ src/*
done
