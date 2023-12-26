const JULIA_ROLES = Set(["obj", "macro", "func", "abstract", "type", "mod", "obj"])


@doc raw"""
An item inside an [`Inventory`](@ref).

```julia
item = InventoryItem(; name, role, uri, priority=1, domain="jl", dispname="-")
```

represents a linkable item inside a project documentation, referenced by
`name`. The `domain` and `role` take their semantics from the
[Sphinx project](@extref sphinx usage/domains/index), see *Attributes* for
details on these parameters, as well as `priority` and `dispname`. The `uri` is
relative to a project root, which should be the
[`Inventory.root_url`](@ref Inventory) of the `inventory` containing the
`InventoryItem`.

For convenience, an `InventoryItem` can also be instantiated from a mapping
`spec => uri`, where ```spec=":domain:role:`name`"``` borrows from Sphinx'
[cross-referencing syntax](@extref sphinx usage/referencing):

```julia
item = IventoryItem(
    ":domain:role:`name`" => uri;
    dispname=<name>,
    priority=(<domain == "std" ? -1 : 1>)
)
```

The `domain` is optional: if ```spec=":role:`name`"```, the `domain` is `"std"`
for `role="label"` and `"jl"` otherwise.

Moreover,

```julia
item = IventoryItem(
    object => uri;
    dispname=<name>,
    priority=1
)
```

indicates that the docstring for the given `object` is available at the given
`uri` within the documentation of the package containing `object`. The `name`
will be the fully qualified name of `object`, and `role` is determined
automatically based on the type of `object`.

Lastly,

```julia
item = IventoryItem(
    "title" => uri;
    dispname=<title>,
    priority=-1
)
```

indicates a link to a section header in the documentation of a project. The
`name` will be a sluggified version of the title, making the `item` equivalent
to ```item = IventoryItem(":std:label:`name`" => uri; dispname=title,
priority=-1)```.

# Attributes

* `name`: The object name for referencing. For code objects, this should be the
   fully qualified name. For section names, it may be a slugified
   version of the section title. It must have non-zero length.

* `domain`: The name of a [Sphinx domain](@extref sphinx usage/domains/index).
   Should be `"jl"` for Julia code objects (default), `"py"` for Python code
   objects, and `"std"` for text objects such as section names. Must have
   non-zero length, and must not contain whitespace or a colon.

* `role`: A domain-specific role. For the `jl` domain, should be one of
  `"macro"`, `"func"`, `"abstract"`, `"type"`, `"mod"`, or `"obj"`. Must have
  nonzero length, must match a role defined in the domain, and must not contain
  whitespace.

* `priority`: An integer flag for placement in search results. Used when
  searching in an [`Inventory`](@ref), for item access in an
  [`Inventory`](@ref), and with [`find_in_inventory`](@ref). The following flag
  values are supported:

  - `1`: the "default" priority. Used by default for all objects not in the
    `"std"` domain (that is, all "code" objects such as those in the `"jl"`
    domain).
  - `0`: object is important
  - `2` (or higher): object is unimportant
  - `-1` (or lower): object is "hidden" (may be omitted from search). Used by
    default for all objects in the `std` domain (section titles)

  See [`find_in_inventory`](@ref) for details. The above semantics match those
  used by [Sphinx](https://github.com/sphinx-doc/sphinx/blob/2f60b44999d7e610d932529784f082fc1c6af989/sphinx/domains/__init__.py#L370-L381).

* `uri`: A URI for the location of the object's documentation,
  relative to the location of the inventory file containing the `item`. Must
  not contain whitespace. May end with `"$"` to indicate a placeholder for
  `name` (usually as `"#$"`, for an HTML anchor matching `name`).

* `dispname`: A full plain text representation of the object. May be `"-"` if
  the display name is identical to `name` (which it should be for code
  objects). For section titles, this should be the plain text of the title,
  without formatting, but not slugified.

# Methods

* [`uri`](@ref) – Extract the full URI, resolving the `$` placeholder and
  prepending a `root_url`, if applicable.
* [`dispname`](@ref) – Extract the `dispname`, resolving the "-" shorthand, if
  applicable.
* [`spec`](@ref) – Return the specification string ```":domain:role:`name`"```
  associated with the item
"""
struct InventoryItem

    name::String
    domain::String
    role::String
    priority::Int64
    uri::String
    dispname::String

    function InventoryItem(
        name::AbstractString,
        domain::AbstractString,
        role::AbstractString,
        priority::Int64,
        uri::AbstractString,
        dispname::AbstractString
    )
        isempty(name) && throw(ArgumentError("`name` must have non-zero length."))
        startswith(name, "#") && throw(ArgumentError("`name` must not start with `#`."))
        isempty(domain) && throw(ArgumentError("`domain` must have non-zero length."))
        contains(domain, r"[\s:]") &&
            throw(ArgumentError("`domain` must not contain whitespace or colon."))
        isempty(role) && throw(ArgumentError("`role` must have non-zero length."))
        contains(role, r"\s") && throw(ArgumentError("`role` must not contain whitespace."))
        contains(uri, r"\s") && throw(ArgumentError("`uri` must not contain whitespace."))
        startswith(uri, r"https?://") && throw(ArgumentError("`uri` must be relative."))
        while (startswith(uri, "//"))
            uri = chop(uri, head=1, tail=0)
        end
        if endswith(uri, name)
            uri = uri[begin:end-length(name)] * "\$"
        end
        isempty(dispname) && throw(ArgumentError("`dispname` must have non-zero length."))
        if dispname == name
            dispname = "-"
        end
        new(strip(name), domain, role, priority, uri, strip(dispname))
    end

end


function InventoryItem(; name, role, uri, domain="jl", priority=1, dispname="-")
    InventoryItem(name, domain, role, priority, uri, dispname)
end


const _rx_domain_role_name = r"^(:((?<domain>\w+):)?((?<role>\w+):)?)?(?<name>.+)$"


function _split_domain_role_name(domain_role_name::AbstractString)
    m = match(_rx_domain_role_name, domain_role_name)
    if isnothing(m)
        throw(ArgumentError("Invalid inventory key: $(repr(domain_role_name))"))
    end
    name = m["name"]
    if startswith(name, "`") && endswith(name, "`")
        name = chop(name, head=1, tail=1)
    elseif startswith(name, "\"") && endswith(name, "\"")
        name = chop(name, head=1, tail=1)
    end
    if isnothing(m["role"])
        # If only a role is given (":func:f"), the `func` syntactically looks
        # like a domain, according to the regex
        role = isnothing(m["domain"]) ? "" : string(m["domain"])
        domain = ""
    else
        role = string(m["role"])
        domain = string(m["domain"])
    end
    return domain, role, name
end


function fully_qualified_name(obj)
    parent = parentmodule(obj)
    name = string(nameof(obj))
    if parent == obj || parent === Main || parent === Core
        return name
    else
        return fully_qualified_name(parent) * "." * name
    end
end


function get_inventory_role(obj)
    if obj isa Function
        if startswith(string(nameof(obj)), "@")
            return "macro"
        else
            return "func"
        end
    elseif obj isa DataType
        if isabstracttype(obj)
            return "abstract"
        else
            return "type"
        end
    elseif obj isa UnionAll
        # Parametric type
        return "type"
    elseif obj isa Module
        return "mod"
    else
        return "obj"
    end
end


# Should match Documenter.slugify
function slugify(s::AbstractString)
    s = replace(s, r"\s+" => "-")
    s = replace(s, r"&" => "-and-")
    s = replace(s, r"[^\p{L}\p{P}\d\-]+" => "")
    s = strip(replace(s, r"\-\-+" => "-"), '-')
    return s
end


function InventoryItem(pair::Pair; dispname=nothing, priority=nothing)
    obj_or_spec, uri = pair
    if obj_or_spec isa AbstractString
        domain, role, name = _split_domain_role_name(obj_or_spec)
        dispname = isnothing(dispname) ? name : dispname
        if isempty(domain)
            if isempty(role)
                if endswith(obj_or_spec, "`")
                    domain = "jl"
                    role = "obj"
                else
                    domain = "std"
                    role = "label"
                    name = slugify(name)
                end
            else
                if role in JULIA_ROLES
                    domain = "jl"
                elseif role == "label"
                    domain = "std"
                else
                    throw(ArgumentError("Unknown role: $(repr(role))"))
                end
            end
        end
    else
        domain = "jl"
        obj = obj_or_spec
        name = fully_qualified_name(obj)
        dispname = isnothing(dispname) ? name : dispname
        role = get_inventory_role(obj)
    end
    if isnothing(priority)
        priority = (domain == "std") ? -1 : 1
    end
    return InventoryItem(name, domain, role, priority, uri, dispname)
end


function Base.show(io::IO, item::InventoryItem)
    full = get(io, :full, false)
    domain = item.domain
    priority = item.priority
    write(io, "InventoryItem(")
    if full
        write(io, "name=$(repr(item.name)), ")
        write(io, "domain=$(repr(domain)), ")
        write(io, "role=$(repr(item.role)), ")
        write(io, "priority=$(repr(priority)), ")
        write(io, "uri=$(repr(uri(item))), ")
        write(io, "dispname=$(repr(dispname(item)))")
    else
        spec = ":$(domain):$(item.role):`$(item.name)`"
        write(io, repr(spec), " => ", repr(item.uri))
        if ((domain == "std") && (priority != -1)) || (priority != 1)
            write(io, ", priority=$(repr(priority))")
        end
        if item.dispname != "-"
            write(io, ", dispname=$(repr(item.dispname))")
        end
    end
    write(io, ")")
end



"""Obtain the full URI for an [`InventoryItem`](@ref)

```julia
uri_str = uri(item; root_url="")
```

fully expands `item.uri` and prepends `root_url`.
"""
function uri(item::InventoryItem; root_url::AbstractString="")
    _uri = item.uri
    if endswith(_uri, "\$")
        _uri = chop(_uri) * item.name
    end
    return root_url * _uri
end


""" Return the specification string of an [`InventoryItem`](@ref).

```julia
item_spec = spec(item)
```

returns a string of the form ```":domain:role:`name`"``` using the attributes
of the given `item`.
"""
spec(item::InventoryItem) = ":$(item.domain):$(item.role):`$(item.name)`"


"""Obtain the full display name for an [`InventoryItem`](@ref).

```julia
display_name = dispname(item)
```

returns `item.dispname` with `"-"` expanded to `item.name`.
"""
function dispname(item::InventoryItem)
    return item.dispname == "-" ? item.name : item.dispname
end