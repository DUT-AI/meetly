class MeetingAudioState {
  final String title;
  final Duration position;
  final Duration bufferedPosition;
  final Duration totalDuration;
  final bool isPlaying;
  final bool isLoading;
  final double speed;

  const MeetingAudioState({
    this.title = '',
    this.position = Duration.zero,
    this.bufferedPosition = Duration.zero,
    this.totalDuration = Duration.zero,
    this.isPlaying = false,
    this.isLoading = false,
    this.speed = 1.0,
  });

  MeetingAudioState copyWith({
    String? title,
    Duration? position,
    Duration? bufferedPosition,
    Duration? totalDuration,
    bool? isPlaying,
    bool? isLoading,
    double? speed,
  }) {
    return MeetingAudioState(
      title: title ?? this.title,
      position: position ?? this.position,
      bufferedPosition: bufferedPosition ?? this.bufferedPosition,
      totalDuration: totalDuration ?? this.totalDuration,
      isPlaying: isPlaying ?? this.isPlaying,
      isLoading: isLoading ?? this.isLoading,
      speed: speed ?? this.speed,
    );
  }
}
