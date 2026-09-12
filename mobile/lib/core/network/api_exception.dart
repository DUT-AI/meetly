import 'package:dio/dio.dart';

class ApiException implements Exception {
  final String message;
  final int? statusCode;
  final dynamic data;

  ApiException({
    required this.message,
    this.statusCode,
    this.data,
  });

  factory ApiException.fromDioError(DioException dioError) {
    switch (dioError.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return ApiException(
          message: 'Kết nối mạng quá thời gian chờ. Vui lòng thử lại.',
          statusCode: dioError.response?.statusCode,
        );
      case DioExceptionType.badResponse:
        final response = dioError.response;
        final statusCode = response?.statusCode;
        final errorMessage = _parseErrorMessage(response?.data);

        return ApiException(
          message: errorMessage,
          statusCode: statusCode,
          data: response?.data,
        );
      case DioExceptionType.cancel:
        return ApiException(message: 'Yêu cầu đã bị hủy.');
      case DioExceptionType.connectionError:
        return ApiException(
          message: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng.',
        );
      default:
        return ApiException(
          message: 'Lỗi không xác định: ${dioError.message}',
        );
    }
  }

  static String _parseErrorMessage(dynamic data) {
    if (data == null) return 'Đã có lỗi xảy ra từ máy chủ.';
    if (data is String) return data.isNotEmpty ? data : 'Đã có lỗi xảy ra từ máy chủ.';
    if (data is Map) {
      final detail = data['detail'] ?? data['message'] ?? data['error'];
      if (detail != null) {
        return _formatDetail(detail);
      }
    }
    return 'Đã có lỗi xảy ra từ máy chủ.';
  }

  static String _formatDetail(dynamic detail) {
    if (detail is String) return detail;
    if (detail is List) {
      final messages = <String>[];
      for (final item in detail) {
        if (item is Map) {
          final msg = item['msg']?.toString();
          final loc = item['loc'];
          String? field;
          if (loc is List && loc.isNotEmpty) {
            final last = loc.last.toString();
            if (last != 'body') {
              field = last;
            }
          }
          if (msg != null) {
            var cleanMsg = msg.replaceFirst(RegExp(r'^Value error,\s*', caseSensitive: false), '');
            cleanMsg = cleanMsg.replaceFirst('value is not a valid email address: ', 'Email không hợp lệ: ');
            if (field != null) {
              messages.add('$field: $cleanMsg');
            } else {
              messages.add(cleanMsg);
            }
          }
        } else if (item != null) {
          messages.add(item.toString());
        }
      }
      if (messages.isNotEmpty) {
        return messages.join('\n');
      }
    }
    if (detail is Map) {
      final msg = detail['msg'] ?? detail['message'] ?? detail['error'];
      if (msg != null) return msg.toString();
    }
    return 'Dữ liệu yêu cầu không hợp lệ.';
  }

  @override
  String toString() => message;
}
