using Test
using TestingUtilities: @Test
using DocInventories
using DocInventories: uri, spec, find_in_inventory
using Downloads: RequestError
using IOCapture: IOCapture


@testset "Read quantumpropagators.inv" begin

    inventory = Inventory(
        joinpath(@__DIR__, "quantumpropagators.inv");
        root_url="https://juliaquantumcontrol.github.io/QuantumPropagators.jl/stable/"
    )
    @test inventory.project == "QuantumPropagators.jl"
    m = match(r"^Inventory\(\"[^\"]+\"; root_url=\"[^\"]+\"\)$", repr(inventory))
    @test !isnothing(m)
    @test length(inventory("Storage")) == 6

end

@testset "Read krotov.inv" begin

    inventory = Inventory(
        joinpath(@__DIR__, "krotov.inv");
        root_url="https://qucontrol.github.io/krotov/v1.2.1/"
    )
    @test inventory.project == "Krotov"
    @test inventory.version == "1.2.1"

    try
        inventory = Inventory("https://qucontrol.github.io/krotov/v1.2.1/objects.inv")
        @test inventory.project == "Krotov"
    catch exc
        @warn "Cannot read online inventory in test" exception = exc
    end

end

@testset "Read invalid" begin
    @test_throws RequestError begin
        Inventory("http://noexist.michaelgoerz.net/"; timeout=0.01, retries=1)
    end
    c = IOCapture.capture(rethrow=Union{}) do
        Inventory("http://example.com")
    end
    if c.value isa ArgumentError
        @test contains(c.value.msg, "Invalid compressed data")
    else
        @warn "Cannot test reading from example.com" exception = c.value
    end
end


@testset "Iventory property names" begin
    inventory = Inventory(project="N/A")
    @test propertynames(inventory) isa Tuple
    @test propertynames(inventory, true) isa Tuple
    @test !(:_items in propertynames(inventory))
    @test (:_items in propertynames(inventory, true))
end


@testset "Build inventory manually" begin
    inventory = Inventory(project="WP", root_url="https://en.wikipedia.org/wiki/")
    push!(
        inventory,
        InventoryItem("Sphinx" => "Sphinx_(documentation_generator)"),
        InventoryItem("reStructuredText" => "ReStructuredText")
    )
    @Test repr(inventory) ==
          "Inventory(\"WP\", \"\", InventoryItem[InventoryItem(\":std:label:`Sphinx`\" => \"Sphinx_(documentation_generator)\", priority=-1), InventoryItem(\":std:label:`reStructuredText`\" => \"ReStructuredText\", priority=-1)], \"https://en.wikipedia.org/wiki/\", \"\", false)"
    @Test repr("text/plain", inventory) ==
          "# Sphinx inventory version 2\n# Project: WP\n# Version: \n# The remainder of this file would be compressed using zlib.\nSphinx std:label -1 Sphinx_(documentation_generator) -\nreStructuredText std:label -1 ReStructuredText -\n"
    append!(
        inventory,
        [
            InventoryItem(
                "Lightweight markup languages" => "Category:Lightweight_markup_languages"
            ),
            InventoryItem("Markup languages" => "Category:Markup_languages")
        ],
        [
            InventoryItem("Julia" => "Julia_(programming_language)"),
            InventoryItem("Python" => "Python_(programming_language)")
        ],
    )
    @test !inventory.sorted
    @test inventory.source == ""
    @test inventory.root_url == "https://en.wikipedia.org/wiki/"
    @test inventory[begin].name == "Sphinx"
    @test inventory[end].name == "Python"
    items_with_parenthesis = inventory(r"uri=.*\(.*\)")
    @test length(items_with_parenthesis) == 3
    _inventory = sort(inventory)
    @test _inventory.sorted
    mktempdir() do tempdir
        filename = joinpath(tempdir, "objects.inv")
        write(filename, inventory)
        inventory = Inventory(filename; root_url="https://en.wikipedia.org/wiki/")
    end
    @test inventory.sorted
    @test inventory.project == "WP"
    @test inventory.root_url == "https://en.wikipedia.org/wiki/"
    @test endswith(inventory.source, "/objects.inv")
    @test inventory.version == ""
    @test length(inventory) == 6
    @test inventory[1].name == "Julia"
    @test spec(inventory[1]) == ":std:label:`Julia`"
    @Test uri(inventory["Julia"]; root_url=inventory.root_url) ==
          "https://en.wikipedia.org/wiki/Julia_(programming_language)"
    @Test uri(inventory, "Julia") ==
          "https://en.wikipedia.org/wiki/Julia_(programming_language)"
    items_with_parenthesis = inventory(r"uri=.*\(.*\)")
    @test length(items_with_parenthesis) == 3
    inventory = filter(it -> startswith(it.uri, "Category"), inventory)
    @test length(inventory) == 2
    @test contains(inventory.source, "filtered")
    @test inventory.sorted
    @test spec(inventory[1]) == ":std:label:`Lightweight-markup-languages`"
    append!(
        inventory,
        [
            InventoryItem("Julia" => "Julia_(programming_language)"),
            InventoryItem("Python" => "Python_(programming_language)")
        ]
    )
    @test length(inventory) == 4
    @test spec(inventory[1]) == ":std:label:`Julia`"

end


@testset "Search inventory" begin

    inventory = Inventory(project="Search", version="1.0")
    push!(
        inventory,
        InventoryItem(":foo:a:`A`" => "#\$"; priority=-1),
        InventoryItem(":foo:b:`A`" => "#\$"; priority=0),
        InventoryItem(":foo:c:`A`" => "#\$"; priority=1),
        InventoryItem(":foo:a:`B`" => "#\$"; priority=1),
        InventoryItem(":foo:a:`C`" => "#\$"; priority=1),
        InventoryItem(":bar:a:`A`" => "#\$"; priority=2),
        InventoryItem(":bar:b:`A`" => "#\$"; priority=0),
        InventoryItem(":bar:c:`A`" => "#\$"; priority=-1),
    )
    @Test repr("text/plain", inventory) == raw"""
    # Sphinx inventory version 2
    # Project: Search
    # Version: 1.0
    # The remainder of this file would be compressed using zlib.
    A foo:a -1 #$ -
    A foo:b 0 #$ -
    A foo:c 1 #$ -
    B foo:a 1 #$ -
    C foo:a 1 #$ -
    A bar:a 2 #$ -
    A bar:b 0 #$ -
    A bar:c -1 #$ -
    """
    @test !inventory.sorted

    found = inventory("`A`")
    @test length(found) == 6
    @test found[begin].priority == 0
    @test found[end].priority == 2

    found = inventory("`A`"; include_hidden_priority=false)
    @test length(found) == 4
    @test found[begin].priority == 0
    @test found[end].priority == 2

    found = inventory(":foo:")
    @test length(found) == 5
    @test found[begin].priority == 0
    @test any([it.priority == -1 for it in found[2:end]])

    c = IOCapture.capture() do
        find_in_inventory(inventory, "A")
    end
    @test c.value == inventory["A"]
    @test c.value.priority == 0
    @test contains(c.output, "Warning: Ambiguous search")

    c = IOCapture.capture() do
        find_in_inventory(inventory, "A"; quiet=true)
    end
    @test !contains(c.output, "Warning: Ambiguous search")

    @test isnothing(inventory["D"])
    c = IOCapture.capture() do
        find_in_inventory(inventory, "D")
    end
    @test isnothing(c.value)
    @test contains(c.output, "Error: Cannot find item")
    c = IOCapture.capture() do
        find_in_inventory(inventory, "D"; quiet=true)
    end
    @test !contains(c.output, "Cannot find item")

    @test find_in_inventory(inventory, "A"; domain="foo", quiet=true) ==
          inventory[":foo:b:`A`"]
    @test find_in_inventory(inventory, "A"; domain="foo", role="c", quiet=true) ==
          inventory[":foo:c:`A`"]
    @test isnothing(
        find_in_inventory(
            inventory,
            "A";
            domain="foo",
            role="a",
            include_hidden_priority=false,
            quiet=true
        )
    )

end