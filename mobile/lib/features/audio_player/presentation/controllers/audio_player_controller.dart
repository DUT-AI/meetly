import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:just_audio/just_audio.dart';
import '../../domain/entities/audio_player_state.dart';

final audioPlayerControllerProvider =
    StateNotifierProvider<AudioPlayerController, MeetingAudioState>((ref) {
  final player = AudioPlayer();
  final controller = AudioPlayerController(player);
  ref.onDispose(() => controller.disposePlayer());
  return controller;
});

class AudioPlayerController extends StateNotifier<MeetingAudioState> {
  final AudioPlayer _player;

  AudioPlayerController(this._player) : super(const MeetingAudioState()) {
    _initStreams();
  }

  void _initStreams() {
    _player.positionStream.listen((pos) {
      state = state.copyWith(position: pos);
    });

    _player.bufferedPositionStream.listen((buf) {
      state = state.copyWith(bufferedPosition: buf);
    });

    _player.durationStream.listen((dur) {
      if (dur != null) {
        state = state.copyWith(totalDuration: dur);
      }
    });

    _player.playerStateStream.listen((playerState) {
      final isPlaying = playerState.playing;
      final processingState = playerState.processingState;
      final isLoading = processingState == ProcessingState.loading ||
          processingState == ProcessingState.buffering;

      state = state.copyWith(
        isPlaying: isPlaying,
        isLoading: isLoading,
      );
    });
  }

  Future<void> loadAudio({required String url, required String title}) async {
    try {
      state = state.copyWith(title: title, isLoading: true);
      await _player.setUrl(url);
      state = state.copyWith(isLoading: false);
      _player.play();
    } catch (e) {
      state = state.copyWith(isLoading: false);
    }
  }

  Future<void> togglePlayPause() async {
    if (_player.playing) {
      await _player.pause();
    } else {
      await _player.play();
    }
  }

  Future<void> seek(Duration position) async {
    await _player.seek(position);
  }

  Future<void> setSpeed(double speed) async {
    await _player.setSpeed(speed);
    state = state.copyWith(speed: speed);
  }

  Future<void> skipForward10() async {
    final newPos = _player.position + const Duration(seconds: 10);
    if (state.totalDuration > Duration.zero && newPos > state.totalDuration) {
      await _player.seek(state.totalDuration);
    } else {
      await _player.seek(newPos);
    }
  }

  Future<void> skipBackward10() async {
    final newPos = _player.position - const Duration(seconds: 10);
    if (newPos < Duration.zero) {
      await _player.seek(Duration.zero);
    } else {
      await _player.seek(newPos);
    }
  }

  void disposePlayer() {
    _player.dispose();
  }
}
