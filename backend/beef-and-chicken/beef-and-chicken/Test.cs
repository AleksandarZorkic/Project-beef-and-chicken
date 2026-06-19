namespace beef_and_chicken
{
    public class Test
    {
        class Person
        {
            public string Name { get; set; }
            public int Age { get; set; }
            public bool IsEmployed { get; set; }
        }

        var people = new List<Person>
{
    new Person { Name = "Ana", Age = 25, IsEmployed = true },
    new Person { Name = "Marko", Age = 17, IsEmployed = false },
    new Person { Name = "Ivan", Age = 32, IsEmployed = true },
    new Person { Name = "Jelena", Age = 19, IsEmployed = false },
    new Person { Name = "Mina", Age = 24, IsEmployed = false },
};

    }
}
