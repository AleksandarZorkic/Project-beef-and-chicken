using beef_and_chicken.Domain.Exceptions;
using System.Diagnostics;
using System.Net;
using System.Text.Json;

namespace beef_and_chicken.Presentation.Middlewear
{
    public class ExceptionHandlingMiddleware : IMiddleware
    {
        private readonly ILogger<ExceptionHandlingMiddleware> _logger;

        public ExceptionHandlingMiddleware(ILogger<ExceptionHandlingMiddleware> logger)
        {
            _logger = logger;
        }
            public async Task InvokeAsync(HttpContext context, RequestDelegate next)
        {
            try
            {
                await next(context);
            }
            catch (Exception ex)
            {
                await HandleExceptionAsync(context, ex);
            }
        }

        private async Task HandleExceptionAsync(HttpContext context, Exception ex)
        {
            var traceId = Activity.Current?.TraceId.ToString() ?? Guid.NewGuid().ToString();

            context.Response.Headers["X-Trace-Id"] = traceId;

            var (statusCode, logLevel) = ex switch
            {
                BadRequestException => (HttpStatusCode.BadRequest, LogLevel.Warning),
                ConflictException => (HttpStatusCode.Conflict, LogLevel.Warning),
                ForbiddenException => (HttpStatusCode.Forbidden, LogLevel.Warning),
                NotFoundException => (HttpStatusCode.NotFound, LogLevel.Information),
                _ => (HttpStatusCode.InternalServerError, LogLevel.Error)                
            };

            _logger.Log(
                logLevel,
                ex,
                "An exception occurred. Type={ExceptionType}, Message={Message}, Path={RequestPath}, TraceId={TraceId}",
                    ex.GetType().Name,
                    ex.Message,
                    context.Request.Path,
                    traceId
            );

            var errorMessage = statusCode == HttpStatusCode.InternalServerError
                ? "Došlo je do greške na serveru."
                : ex.Message;

            var response = new
            {
                error = errorMessage,
                traceId
            };

            context.Response.ContentType = "application/json";
            context.Response.StatusCode = (int)statusCode;

            await context.Response.WriteAsync(JsonSerializer.Serialize(response));
        }
    }
}
