using System.ComponentModel.DataAnnotations;

namespace RePrompt.Api.Validation;

/// <summary>
/// Minimal APIs do not run DataAnnotations automatically, so validation is invoked
/// explicitly. Without this a MaxLength violation surfaces as a 500 from SQLite
/// rather than a 400 the client can act on.
/// </summary>
public static class RequestValidator
{
    public static bool TryValidate<T>(T model, out Dictionary<string, string[]> errors) where T : notnull
    {
        var results = new List<ValidationResult>();
        var isValid = Validator.TryValidateObject(model, new ValidationContext(model), results, validateAllProperties: true);

        errors = results
            .SelectMany(result => result.MemberNames.DefaultIfEmpty(string.Empty),
                        (result, member) => (Member: member, result.ErrorMessage))
            .GroupBy(entry => entry.Member)
            .ToDictionary(
                group => group.Key,
                group => group.Select(entry => entry.ErrorMessage ?? "Invalid value.").ToArray());

        return isValid;
    }
}
