all: proto-gen-from-docker

proto-gen-from-docker:
	docker build -t ts-protoc .
	docker run --user $(shell id -u):$(shell id -g) --rm -v $(CURDIR):/workspace ts-protoc build

proto: download
	mkdir -p src/generated
	# npm installs into a non-path
	#sudo npm i -g ts-protoc-gen@0.15.0
	protoc ./ion/proto/ion/ion.proto -I./ion --plugin=protoc-gen-ts=/usr/local/bin/protoc-gen-ts --js_out=import_style=commonjs,binary:./src/generated --ts_out=service=grpc-web:./src/generated
	protoc ./ion/proto/rtc/rtc.proto -I./ion --plugin=protoc-gen-ts=/usr/local/bin/protoc-gen-ts --js_out=import_style=commonjs,binary:./src/generated --ts_out=service=grpc-web:./src/generated
	protoc ./ion/apps/room/proto/room.proto -I./ion --plugin=protoc-gen-ts=/usr/local/bin/protoc-gen-ts --js_out=import_style=commonjs,binary:./src/generated --ts_out=service=grpc-web:./src/generated
	
	#rjk added back sfu proto from https://raw.githubusercontent.com/pion/ion/e141bfffb2e38b94d07f85b23de7d36c21b6d371/proto/sfu/sfu.proto
	curl https://raw.githubusercontent.com/pion/ion/e141bfffb2e38b94d07f85b23de7d36c21b6d371/proto/sfu/sfu.proto --create-dirs -o ./ion/proto/sfu/sfu.proto
	protoc ./ion/proto/sfu/sfu.proto -I./ion --plugin=protoc-gen-ts=/usr/local/bin/protoc-gen-ts --js_out=import_style=commonjs,binary:./src/generated --ts_out=service=grpc-web:./src/generated
	#end rjk

	mkdir -p lib
	cp -rf ./src/generated lib

download: clean
	git clone https://github.com/pion/ion --depth=1

clean:
	rm -rf src/generated lib/generated ion

build: proto
	npm install
	npm run build

