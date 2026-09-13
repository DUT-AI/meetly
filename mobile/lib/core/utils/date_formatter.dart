import 'package:intl/intl.dart';

class DateFormatter {
  DateFormatter._();

  static final DateFormat _shortDate = DateFormat('dd/MM/yyyy');
  static final DateFormat _dateTime = DateFormat('dd/MM/yyyy HH:mm');
  static final DateFormat _timeOnly = DateFormat('HH:mm');

  static String formatDate(DateTime? date) {
    if (date == null) return '';
    return _shortDate.format(date);
  }

  static String formatDateTime(DateTime? date) {
    if (date == null) return '';
    return _dateTime.format(date);
  }

  static String formatTime(DateTime? date) {
    if (date == null) return '';
    return _timeOnly.format(date);
  }

  static String formatDuration(Duration duration) {
    final minutes = duration.inMinutes.remainder(60).toString().padLeft(2, '0');
    final seconds = duration.inSeconds.remainder(60).toString().padLeft(2, '0');
    if (duration.inHours > 0) {
      final hours = duration.inHours.toString().padLeft(2, '0');
      return '$hours:$minutes:$seconds';
    }
    return '$minutes:$seconds';
  }
}
