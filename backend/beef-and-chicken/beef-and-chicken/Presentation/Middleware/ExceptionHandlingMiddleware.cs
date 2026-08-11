using beef_and_chicken.Application.Exceptions;
using System.Diagnostics;
using System.Net;
using Npgsql;
using beef_and_chicken.Application.DTOs;

namespace beef_and_chicken.Presentation.Middlewear
{
    public class ExceptionHandlingMiddleware : IMiddleware
    {
        private const string ActiveDeliveryRushRunConstraint =
            "UX_DeliveryRushRuns_UserId_Started";

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

            var (statusCode, logLevel, errorMessage) = ex switch
            {
                _ when IsActiveDeliveryRushRunConflict(ex) =>
                    (
                        HttpStatusCode.Conflict,
                        LogLevel.Warning,
                        "Već imate aktivnu Delivery Rush partiju."
                    ),

                BadRequestException =>
                    (
                        HttpStatusCode.BadRequest,
                        LogLevel.Warning,
                        ex.Message
                    ),

                ConflictException =>
                    (
                        HttpStatusCode.Conflict,
                        LogLevel.Warning,
                        ex.Message
                    ),

                ForbiddenException =>
                    (
                        HttpStatusCode.Forbidden,
                        LogLevel.Warning,
                        ex.Message
                    ),

                NotFoundException =>
                    (
                        HttpStatusCode.NotFound,
                        LogLevel.Information,
                        ex.Message
                    ),

                _ =>
                    (
                        HttpStatusCode.InternalServerError,
                        LogLevel.Error,
                        "Došlo je do greške na serveru."
                    )
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


            var response = new ApiErrorResponseDto
            {
                Error = errorMessage,
                TraceId = traceId
            };

            context.Response.StatusCode =
                (int)statusCode;

            await context.Response.WriteAsJsonAsync(
                response,
                cancellationToken:
                    context.RequestAborted);
        }

        private static bool IsActiveDeliveryRushRunConflict(Exception exception)
        {
            Exception? currentException = exception;

            while (currentException != null)
            {
                if (currentException is PostgresException postgresException)
                {
                    return
                        postgresException.SqlState ==
                            PostgresErrorCodes.UniqueViolation &&
                        postgresException.ConstraintName ==
                            ActiveDeliveryRushRunConstraint;
                }

                currentException = currentException.InnerException;
            }

            return false;
        }
    }
}
