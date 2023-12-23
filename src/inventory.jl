using CodecZlib
using Downloads: Downloads


const rx_project = r"""
    ^                  # Start of line
    [#][ ]Project:[ ]  # Preamble
    (?P<project>.*)    # Rest of line is project name
    $                  # End of line
"""x

const rx_version = r"""
    ^                   # Start of line
    [#][ ]Version:[ ]   # Preamble
    (?P<version>.*)     # Rest of line is version
    $                   # End of line
"""x

const rx_data = r"""
    ^                    # Start of line
    (?P<name>.+?)        # --> Name
    \s+                  # Dividing space
    (?P<domain>[^\s:]+)  # --> Domain
    :                    # Dividing colon
    (?P<role>[^\s]+)     # --> Role
    \s+                  # Dividing space
    (?P<priority>-?\d+)  # --> Priority
    \s+?                 # Dividing space
    (?P<uri>\S*)         # --> URI
    \s+                  # Dividing space
    (?P<dispname>.+)     # --> Display name
    $                    # End of line
"""x


"""An error indicating an issue with an `objects.inv` file.

```julia
throw(InventoryFormatError(msg))
```
"""
struct InventoryFormatError <: Exception
    msg::String
end


function _read_url(url; timeout=1.0, retries=3, wait_time=1.0)
    attempt = 0
    while true
        try
            return take!(Downloads.download(url, IOBuffer(); timeout))
        catch exc
            attempt += 1
            if attempt >= retries
                rethrow()
            else
                sleep(wait_time * attempt)
            end
        end
    end
end


"""An inventory of objects and link targets in a project documentation.

```julia
inventory = Inventory(source; mime="application/x-sphinxobj", root_url="")
```

loads an inventory file from the given `source`, which can be a URL or the path
to a local file. If it is a URL, the options `timeout` (seconds to wait for
network connections), `retries` (number of times to retry) and `wait_time`
(seconds longer to wait between each retry) may be given.

The `Inventory` acts as a collection of [`InventoryItems`](@ref InventoryItem),
representing all the objects, sections, or other linkable items in the online
documentation of a project.

Alternatively,

```julia
inventory = Inventory(; project, version="", root_url="")
```

with a mandatory `project` argument instantiates an empty inventory.

# Attributes

* `project`: The name of the project
* `version`: The version of the project (e.g., `"1.0.0"`)
* `root_url`: The root URL to which the `item.uri` of any
  [`InventoryItem`](@ref) is relative. If not empty, should start with
  `"https://"` and end with a slash.
* `source`: The URL or filename from which the inventory was loaded, or a
   comment if the inventory was constructed otherwise.
* `sorted`: A boolean to indicate whether the items are sorted by their `name`
   attribute, allowing for efficient lookup. This is `true` for all inventories
   loaded from a URL or file and `false` for manually instantiated inventories.

# Item access

Items can be accessed via iteration (`for item in inventory`), by numeric index
(`inventory[1]`, `inventory[2]`, … `inventory[end]`), or by lookup:
`inventory[name]` or `inventory[spec]`, where `spec` is a string of the form
```":[domain:]role:`name`"```, see the discussion of `spec` in
[`InventoryItem`](@ref). The lookup delegates to [`find_in_inventory`](@ref)
with `quiet=true` and takes into account [`item.priority`](@ref InventoryItem).

# Search

The inventory can be searched by calling `inventory(search;
include_hidden_priority=true)`. This returns a list of all items that contain
`search` in `spec(item)` or `repr(item; context=(:full => true))`. Typically,
`search` would be a string or a [`Regex`](@extref Julia man-regex-literals).
Some examples for common searches:

* A `spec` of the form ```":domain:role:`name`"```, in full, partially, or as a
  regex.
* Part of a url of a page in the project's documentation, as a string
* The title of a section as it appears somewhere in the project's
  documentation.

The search results are sorted by [`abs(item.priority)`](@ref InventoryItem). If
`include_hidden_priority=false`, negative `item.priority` values are omitted.

# Methods

* [`find_in_inventory`](@ref) – find a single item in the `inventory`
* [`filter(f, ::Inventory)`](@ref)] – filter the `inventory` for
  matching items.
* [`collect(inventory)`](@extref Julia Base.collect-Tuple{Any}) – convert the
  `inventory` into a vector of [`InventoryItems`](@ref InventoryItem).
* [`write("objects.inv", inventory)`](@extref Julia Base.write) – write the
  `inventory` to a binary file in the default `Sphinx inventory version 2`
  format.
* [`repr("text/plain", inventory)`](@extref Julia `Base.repr-Tuple{MIME, Any}`)
  – obtain an uncompressed representation of the default `Sphinx inventory
  version 2` format.
* [`uri(inventory, key)`](@ref uri(::Inventory, key)) – obtain the full URI for
  an item from the `inventory`.
* [`push!(inventory, items...)`](@extref Julia Base.push!) – add
  [`InventoryItems`](@ref InventoryItem) to an existing `inventory`.
* [`append!(inventory, collections...)`](@extref Julia Base.append!) – add
  collections of [`InventoryItems`](@ref InventoryItem) to an existing
  `inventory`.
"""
struct Inventory
    project::String
    version::String
    _items::Vector{InventoryItem}  # do not mutate! (screws up sorted search)
    root_url::String
    source::String
    sorted::Bool
end


function Inventory(; project, version="", root_url="")
    Inventory(project, version, InventoryItem[], root_url, "", false)
end

# TODO: implement toml input/output format
# TODO: refactor out read/write function for local file with different mime
# type (with multiple dispatch on the mime type)

function Inventory(
    source::AbstractString;
    mime=MIME"application/x-sphinxobj"(),
    root_url="",
    timeout=1.0,
    retries=3,
    wait_time=1.0
)

    if contains(source, r"^https?://")
        bytes = _read_url(source; timeout=timeout, retries=retries, wait_time=wait_time)
    else
        bytes = read(source)
    end
    buffer = IOBuffer(bytes)

    # Keep the four header lines, which are in plain text
    str = ""
    for _ = 1:4
        str *= readline(buffer; keep=true)
    end

    # Decompress the rest of the file and append decoded text
    if string(mime) == "application/x-sphinxobj"
        try
            str *= String(read(ZlibDecompressorStream(buffer)))
        catch exc
            msg = "Invalid compressed data"
            if exc isa ErrorException
                msg *= ": $(exc.msg)"
            end
            throw(ArgumentError(msg))
        end
    elseif string(mime) == "text/plain"
        str *= read(buffer, String)
    else
        msg = "Invalid mime type '$mime'. Must be one of 'application/x-sphinxobj', 'text/plain'"
        throw(ArgumentError(msg))
    end

    text_buffer = IOBuffer(str)

    header_line = readline(text_buffer)
    if !(header_line == "# Sphinx inventory version 2")
        @show header_line
        msg = "Only v2 objects.inv files currently supported"
        throw(InventoryFormatError(msg))
    end

    project_line = readline(text_buffer)
    m = match(rx_project, project_line)
    if isnothing(m)
        msg = "Invalid project name line: $(repr(project_line))"
        throw(InventoryFormatError(msg))
    else
        project = m["project"]
    end

    version_line = readline(text_buffer)
    m = match(rx_version, version_line)
    if isnothing(m)
        msg = "Invalid project version line: $(repr(version_line))"
        throw(InventoryFormatError(msg))
    else
        version = m["version"]
    end

    compression_line = readline(text_buffer)
    if !contains(compression_line, "zlib")
        msg = "Invalid compression line $(repr(compression_line))"
        throw(InventoryFormatError(msg))
    end

    items = InventoryItem[]
    for line in readlines(text_buffer)
        m = match(rx_data, line)
        try
            if isnothing(m)
                # Lines that don't fit the pattern for an item may be
                # continuations of a multi-line `dispname`
                o = pop!(items)
                dispname = o.dispname * "\n" * line
                item = InventoryItem(o.name, o.domain, o.role, o.priority, o.uri, dispname)
            else
                item = InventoryItem(;
                    name=m["name"],
                    domain=m["domain"],
                    role=m["role"],
                    priority=parse(Int64, m["priority"]),
                    uri=m["uri"],
                    dispname=m["dispname"],
                )
            end
            push!(items, item)
        catch exc # probably `pop!` from empty `items`
            if !(exc isa ArgumentError)
                @error "Internal Error" exception = (exc, Base.catch_backtrace())
            end
            msg = "Unexpected line: $(repr(line))"
            throw(InventoryFormatError(msg))
        end
    end

    items = sort(items; by=(item -> item.name))
    sorted = true

    return Inventory(project, version, items, root_url, source, sorted)

end

function Base.propertynames(inventory::Inventory, private::Bool=false)
    # Note that `private` is not a keyword arg!
    if private
        return fieldnames(Inventory)
    else
        return Tuple(name for name in fieldnames(Inventory) if name != :_items)
    end
end

Base.length(inventory::Inventory) = length(inventory._items)
Base.iterate(inventory::Inventory) = iterate(inventory._items)
Base.iterate(inventory::Inventory, state) = iterate(inventory._items, state)
Base.getindex(inventory::Inventory, ind::Int64) = getindex(inventory._items, ind)
Base.firstindex(inventory::Inventory) = firstindex(inventory._items)
Base.lastindex(inventory::Inventory) = lastindex(inventory._items)


function Base.show(io::IO, inventory::Inventory)
    source = inventory.source
    if isempty(source)
        print(io, "Inventory(")
        print(io, repr(inventory.project), ", ")
        print(io, repr(inventory.version), ", ")
        print(io, repr(inventory._items), ", ")
        print(io, repr(inventory.root_url), ", ")
        print(io, repr(inventory.source), ", ")
        print(io, repr(inventory.sorted), ")")
    else
        root_url = inventory.root_url
        if isempty(root_url)
            print(io, "Inventory($(repr(source)))")
        else
            print(io, "Inventory($(repr(source)); root_url=$(repr(root_url)))")
        end
    end
end


function Base.show(io::IO, ::MIME"text/plain", inventory::Inventory)
    println(io, "# Sphinx inventory version 2")
    println(io, "# Project: $(inventory.project)")
    println(io, "# Version: $(inventory.version)")
    println(io, "# The remainder of this file would be compressed using zlib.")
    for item in inventory._items
        line = "$(item.name) $(item.domain):$(item.role) $(item.priority) $(item.uri) $(item.dispname)\n"
        write(io, line)
    end
end


function Base.write(io::IO, inventory::Inventory)
    println(io, "# Sphinx inventory version 2")
    println(io, "# Project: $(inventory.project)")
    println(io, "# Version: $(inventory.version)")
    println(io, "# The remainder of this file is compressed using zlib.")
    stream = ZlibCompressorStream(io)
    for item in inventory._items
        line = "$(item.name) $(item.domain):$(item.role) $(item.priority) $(item.uri) $(item.dispname)\n"
        write(stream, line)
    end
    close(stream)
end


"""Find an item in the inventory.

```julia
item = find_in_inventory(
    inventory,
    name;
    domain="",
    role="",
    quiet=false,
    include_hidden_priority=true
)
```

returns the top priority [`InventoryItem`](@ref) matching the given `name`. If
the `inventory` contains no matching item, returns `nothing`.

# Arguments

* `inventory`: The [`Inventory`](@ref) to search.
* `name`: The value of the `name` attribute of the [`InventoryItem`](@ref) to
  find. Must match exactly.
* `domain`: If not empty, restrict search to items with a matching `domain`
  attribute.
* `role`: If not empty, restrict search to items with a matching `role`
  attribute.
* `quiet`: If `false` (default), log a warning if the item specification is
  ambiguous (the top priority item of multiple candidates is returned). If no
  matching item can be found, an error will be logged in addition to returning
  `nothing`.
* `include_hidden_priority`: Whether or not to consider items with a negative
  `priority` attribute. If "hidden" items are included (default), they are
  sorted by the absolute value of the `priority`. That is, items with
  `priority=-1` and `priority=1` are considered to be equivalent.

Note that direct item lookup as [`inventory[spec]`](@ref Inventory) where
`spec` is a string of the form ```"[:[domain:]role:]`name`"``` is available as
simplified way to call `find_in_inventory` with `quiet=true`.
"""
function find_in_inventory(
    inventory,
    name;
    domain::String="",
    role::String="",
    quiet=false,
    include_hidden_priority=true,
)::Union{Nothing,InventoryItem}
    items = inventory._items
    if inventory.sorted
        # https://discourse.julialang.org/t/searchsorted-by-attribute/107754/4
        x = InventoryItem(name=name, domain="any", role="any", uri="any")
        found = searchsorted(items, x; by=(item -> item.name))
        candidates = items[found]
    else
        idxs = findall(item -> (item.name == name), items)
        candidates = items[idxs]
    end
    if !isempty(domain)
        candidates = filter(item -> (item.domain == domain), candidates)
    end
    if !isempty(role)
        candidates = filter(item -> (item.role == role), candidates)
    end
    if !include_hidden_priority
        candidates = filter(item -> (item.priority >= 0), candidates)
    end
    if length(candidates) > 1
        sort!(candidates; by=(item -> abs(item.priority)))
        quiet ||
            @warn "Ambiguous search in inventory=$inventory" name domain role candidates
    end
    if length(candidates) > 0
        return candidates[1]
    else
        quiet || @error "Cannot find item in inventory=$inventory" name domain role
        return nothing
    end
end


function Base.getindex(inventory::Inventory, key)
    try
        domain, role, name = _split_domain_role_name(key)
        return find_in_inventory(inventory, name; domain=domain, role=role, quiet=true)
    catch exc
        @error "Invalid key for inventory" key
        return nothing
    end
end


# exposed as `inventory(search; include_hidden_priority)`
function search_in_inventory(inventory, search; include_hidden_priority=true,)
    results = InventoryItem[]
    for item in inventory
        if !include_hidden_priority && (item.priority < 0)
            continue
        end
        if contains(spec(item), search)
            push!(results, item)
        elseif contains(repr(item; context=(:full => true)), search)
            push!(results, item)
        end
    end
    return sort(results; by=(item -> abs(item.priority)))
end


function (inventory::Inventory)(search; include_hidden_priority=true)
    return search_in_inventory(
        inventory,
        search;
        include_hidden_priority=include_hidden_priority
    )
end


function Base.push!(inventory::Inventory, items...)
    if inventory.sorted
        for item in items
            insert_idx = searchsortedfirst(inventory._items, item, by=(item -> item.name))
            insert!(inventory._items, insert_idx, item)
        end
    else
        append!(inventory._items, items)
    end
end

function Base.append!(inventory::Inventory, collections...)
    if inventory.sorted
        for collection in collections
            push!(inventory, collection...)
        end
    else
        append!(inventory._items, collections...)
    end
end

function Base.sort(inventory::Inventory)
    if inventory.sorted
        return inventory
    else
        sorted = true
        return Inventory(
            inventory.project,
            inventory.version,
            sort(inventory._items; by=(item -> item.name)),
            inventory.root_url,
            inventory.source,
            sorted
        )
    end
end


"""Filter an inventory for matching items.

```julia
filtered_inventory = filter(item -> f(item), inventory)
```

create a new [`Inventory`](@ref) containing only the [`InventoryItems`](@ref
InventoryItem) for which `f` returns `true`.
"""
function Base.filter(f, inventory::Inventory)
    items = filter(f, inventory._items)
    return Inventory(
        inventory.project,
        inventory.version,
        items,
        inventory.root_url,
        strip(inventory.source * " (filtered)"),
        inventory.sorted
    )
end


"""
```julia
uri_str = uri(inventory, key)
```

is equivalent to `uri(inventory[key]; root_url=inventory.root_url)`.
"""
function uri(inventory::Inventory, key)
    return uri(inventory[key]; root_url=inventory.root_url)
end
