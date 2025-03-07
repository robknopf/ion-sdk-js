import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import { Signal } from '.';
import { grpc } from '@improbable-eng/grpc-web';
import * as sfu_rpc from '../generated/proto/sfu/sfu_pb_service';
import * as pb from '../generated/proto/sfu/sfu_pb';
import { Trickle } from '../client';
import { Uint8ArrayToJSONString } from './utils';

class IonSFUGRPCWebSignal implements Signal {
  protected client: grpc.Client<pb.SignalRequest, pb.SignalReply>;
  private _connected: boolean = false;
  private _event: EventEmitter;
  private _onopen?: () => void;
  private _onclose?: (ev: Event) => void;
  private _onerror?: (error: Event) => void;
  onnegotiate?: (jsep: RTCSessionDescriptionInit) => void;
  ontrickle?: (trickle: Trickle) => void;
  constructor(uri: string, metadata?: grpc.Metadata) {
    this._event = new EventEmitter();
    const client = grpc.client(sfu_rpc.SFU.Signal, {
      host: uri,
      transport: grpc.WebsocketTransport(),
    }) as grpc.Client<pb.SignalRequest, pb.SignalReply>;

    client.onEnd((status: grpc.Code, statusMessage: string, trailers: grpc.Metadata) => {
      this._onclose?.call(this, new CustomEvent('sfu', { detail: { status, statusMessage } }));
    });

    client.onMessage((reply: pb.SignalReply) => {
      switch (reply.getPayloadCase()) {
        case pb.SignalReply.PayloadCase.JOIN:
          const answer = JSON.parse(Uint8ArrayToJSONString(reply.getJoin()?.getDescription() as Uint8Array));
          this._event.emit('join-reply', answer);
          break;
        case pb.SignalReply.PayloadCase.DESCRIPTION:
          const desc = JSON.parse(Uint8ArrayToJSONString(reply.getDescription() as Uint8Array));
          if (desc.type === 'offer') {
            if (this.onnegotiate) this.onnegotiate(desc);
          } else if (desc.type === 'answer') {
            this._event.emit('description', desc);
          }
          break;
        case pb.SignalReply.PayloadCase.TRICKLE:
          const pbTrickle = reply.getTrickle();
          if (pbTrickle?.getInit() !== undefined) {
            const candidate = JSON.parse(pbTrickle.getInit() as string);
            const trickle = { target: pbTrickle.getTarget(), candidate };
            if (this.ontrickle) this.ontrickle(trickle);
          }
          break;
        case pb.SignalReply.PayloadCase.ICECONNECTIONSTATE:
        case pb.SignalReply.PayloadCase.ERROR:
          break;
      }
    });

    this.client = client;
    this.client.start(metadata);
  }

  join(sid: string, uid: string, offer: RTCSessionDescriptionInit) {
    const request = new pb.SignalRequest();
    const join = new pb.JoinRequest();
    join.setSid(sid);
    join.setUid(uid);
    const buffer = Uint8Array.from(JSON.stringify(offer), (c) => c.charCodeAt(0));
    join.setDescription(buffer);
    request.setJoin(join);
    this.client.send(request);

    return new Promise<RTCSessionDescriptionInit>((resolve, reject) => {
      const handler = (desc: RTCSessionDescriptionInit) => {
        resolve({ type: 'answer', sdp: desc.sdp });
        this._event.removeListener('join-reply', handler);
      };
      this._event.addListener('join-reply', handler);
    });
  }

  trickle(trickle: Trickle) {
    const request = new pb.SignalRequest();
    const pbTrickle = new pb.Trickle();
    pbTrickle.setInit(JSON.stringify(trickle.candidate));
    request.setTrickle(pbTrickle);
    this.client.send(request);
  }

  offer(offer: RTCSessionDescriptionInit) {
    const id = uuidv4();
    const request = new pb.SignalRequest();
    const buffer = Uint8Array.from(JSON.stringify(offer), (c) => c.charCodeAt(0));
    request.setDescription(buffer);
    this.client.send(request);

    return new Promise<RTCSessionDescriptionInit>((resolve, reject) => {
      const handler = (desc: RTCSessionDescriptionInit) => {
        resolve({ type: 'answer', sdp: desc.sdp });
        this._event.removeListener('description', handler);
      };
      this._event.addListener('description', handler);
    });
  }

  answer(answer: RTCSessionDescriptionInit) {
    const request = new pb.SignalRequest();
    const buffer = Uint8Array.from(JSON.stringify(answer), (c) => c.charCodeAt(0));
    request.setDescription(buffer);
    this.client.send(request);
  }

  close() {
    this.client.close();
  }

  set onopen(onopen: () => void) {
    if (this.client) {
      onopen();
    }
    this._onopen = onopen;
  }

  set onerror(onerror: (error: Event) => void) {
    this._onerror = onerror;
  }

  set onclose(onclose: (ev: Event) => void) {
    this._onclose = onclose;
  }
}

export { IonSFUGRPCWebSignal };
