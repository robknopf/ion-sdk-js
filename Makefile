all: clean download proto-gen-from-docker build

proto-gen-from-docker:
	docker build -t ts-protoc .
	docker run --user $(shell id -u):$(shell id -g) --rm -v $(CURDIR):/workspace ts-protoc proto

proto:
	mkdir -p src/_library
	#sudo npm i -g ts-protoc-gen@0.15.0
	protoc ./ion/proto/ion/ion.proto -I./ion --plugin=protoc-gen-ts=/usr/local/bin/protoc-gen-ts --js_out=import_style=commonjs,binary:./src/_library --ts_out=service=grpc-web:./src/_library
	protoc ./ion/proto/rtc/rtc.proto -I./ion --plugin=protoc-gen-ts=/usr/local/bin/protoc-gen-ts --js_out=import_style=commonjs,binary:./src/_library --ts_out=service=grpc-web:./src/_library
	protoc ./ion/apps/room/proto/room.proto -I./ion --plugin=protoc-gen-ts=/usr/local/bin/protoc-gen-ts --js_out=import_style=commonjs,binary:./src/_library --ts_out=service=grpc-web:./src/_library
	
	#rjk added back sfu proto from https://raw.githubusercontent.com/pion/ion/e141bfffb2e38b94d07f85b23de7d36c21b6d371/proto/sfu/sfu.proto
	curl https://raw.githubusercontent.com/pion/ion/e141bfffb2e38b94d07f85b23de7d36c21b6d371/proto/sfu/sfu.proto --create-dirs -o ./ion/proto/sfu/sfu.proto
	protoc ./ion/proto/sfu/sfu.proto -I./ion --plugin=protoc-gen-ts=/usr/local/bin/protoc-gen-ts --js_out=import_style=commonjs,binary:./src/_library --ts_out=service=grpc-web:./src/_library
	#end rjk

	mkdir -p lib
	cp -rf ./src/_library lib

download:
	git clone https://github.com/pion/ion --depth=1

clean:
	rm -rf src/_library ion

build:
	npm install
	npm run build

