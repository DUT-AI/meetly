import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

class LoggingInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    if (kDebugMode) {
      debugPrint('[DIO REQUEST] ${options.method} -> ${options.uri}');
      if (options.data != null) {
        debugPrint('[DIO DATA] ${options.data}');
      }
    }
    super.onRequest(options, handler);
  }

  @override
  void onResponse(Response response, ResponseInterceptorHandler handler) {
    if (kDebugMode) {
      debugPrint(
        '[DIO RESPONSE] ${response.statusCode} <- ${response.requestOptions.uri}',
      );
    }
    super.onResponse(response, handler);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    if (kDebugMode) {
      debugPrint(
        '[DIO ERROR] ${err.response?.statusCode} <- ${err.requestOptions.uri}: ${err.message}',
      );
    }
    super.onError(err, handler);
  }
}
