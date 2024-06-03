var documenterSearchIndex = {"docs":
[{"location":"api/#API","page":"API","title":"API","text":"","category":"section"},{"location":"api/","page":"API","title":"API","text":"The DocInventories package exports two names:","category":"page"},{"location":"api/","page":"API","title":"API","text":"Inventory\nInventoryItem","category":"page"},{"location":"api/","page":"API","title":"API","text":"All other names should either be imported explicitly, e.g.,","category":"page"},{"location":"api/","page":"API","title":"API","text":"using DocInventories: uri, spec","category":"page"},{"location":"api/","page":"API","title":"API","text":"for uri and spec, or used with the DocInventories prefix, e.g., DocInventories.save.","category":"page"},{"location":"api/","page":"API","title":"API","text":"In typical usage, the following non-exported I/O routines would be commonly used:","category":"page"},{"location":"api/","page":"API","title":"API","text":"DocInventories.save\nDocInventories.convert\nDocInventories.set_metadata","category":"page"},{"location":"api/","page":"API","title":"API","text":"","category":"page"},{"location":"api/","page":"API","title":"API","text":"Modules = [DocInventories]","category":"page"},{"location":"api/#DocInventories.MIME_TYPES","page":"API","title":"DocInventories.MIME_TYPES","text":"Default map of file extensions to MIME types.\n\nMIME_TYPES = Dict(\n    \".txt\" => MIME(\"text/x-intersphinx\"),\n    \".inv\" => MIME(\"application/x-intersphinx\"),\n    \".toml\" => MIME(\"application/toml\"),\n    \".txt.gz\" => MIME(\"text/x-intersphinx+gzip\"),\n    \".toml.gz\" => MIME(\"application/toml+gzip\"),\n)\n\nSee Inventory File Formats for details.\n\n\n\n\n\n","category":"constant"},{"location":"api/#DocInventories.Inventory","page":"API","title":"DocInventories.Inventory","text":"An inventory of link targets in a project documentation.\n\ninventory = Inventory(\n    source;\n    mime=auto_mime(source),\n    root_url=root_url(source)\n)\n\nloads an inventory file from the given source, which can be a URL or the path to a local file. If it is a URL, the options timeout (seconds to wait for network connections), retries (number of times to retry) and wait_time (seconds longer to wait between each retry) may be given. The source must contain data in the given mime type. By default, the mime type is derived from the file extension, via auto_mime.\n\nThe Inventory acts as a collection of InventoryItems, representing all the objects, sections, or other linkable items in the online documentation of a project.\n\nAlternatively,\n\ninventory = Inventory(; project, version=\"\", root_url=\"\", items=[])\n\nwith a mandatory project argument instantiates an inventory with the InventoryItems in items. If items is not given, the resulting empty inventory can have InventoryItems added afterwards via push!.\n\nAttributes\n\nproject: The name of the project\nversion: The version of the project (e.g., \"1.0.0\")\nroot_url: The root URL to which the item.uri of any InventoryItem is relative. If not empty, should start with \"https://\" and end with a slash.\nsource: The URL or filename from which the inventory was loaded.\nsorted: A boolean to indicate whether the items are sorted by their name  attribute, allowing for efficient lookup. This is true for all inventories  loaded from a URL or file and false for manually instantiated inventories.\n\nNote that source and sorted are informational attributes only and are ignored when comparing two Inventory objects.\n\nItem access\n\nItems can be accessed via iteration (for item in inventory), by numeric index (inventory[1], inventory[2], … inventory[end]), or by lookup: inventory[name] or inventory[spec], where spec is a string of the form \":[domain:]role:`name`\", see the discussion of spec in InventoryItem. The lookup delegates to find_in_inventory with quiet=true and takes into account item.priority.\n\nSearch\n\nThe inventory can be searched by calling inventory(search; include_hidden_priority=true). This returns a list of all items that contain search in spec(item) or repr(item; context=(:full => true)). Typically, search would be a string or a Regex. Some examples for common searches:\n\nA spec of the form \":domain:role:`name`\", in full, partially, or as a regex.\nPart of a url of a page in the project's documentation, as a string\nThe title of a section as it appears somewhere in the project's documentation.\n\nThe search results are sorted by abs(item.priority). If include_hidden_priority=false, negative item.priority values are omitted.\n\nMethods\n\nfind_in_inventory(inventory, name) – find a single item in the inventory\nsave(filename, inventory; mime=auto_mime(filename)) – write the inventory to a file in any supported output format.\nshow_full(inventory) – show the unabbreviated inventory in the REPL (ideally via TerminalPager)\nuri(inventory, key) – obtain the full URI for an item from the inventory.\npush!(inventory, items...) – add InventoryItems to an existing inventory.\nappend!(inventory, collections...) – add collections of InventoryItems to an existing inventory.\ncollect(inventory) – convert the inventory to a standard Vector of InventoryItems.\nset_metadata(inventory) – Modify the project and version metadata.\nsort(inventory) – convert an unsorted inventory into a sorted one.\n\n\n\n\n\n","category":"type"},{"location":"api/#DocInventories.InventoryFormatError","page":"API","title":"DocInventories.InventoryFormatError","text":"An error indicating an issue with an inventory file.\n\nthrow(InventoryFormatError(msg))\n\n\n\n\n\n","category":"type"},{"location":"api/#DocInventories.InventoryItem","page":"API","title":"DocInventories.InventoryItem","text":"An item inside an Inventory.\n\nitem = InventoryItem(; name, role, uri, priority=1, domain=\"jl\", dispname=\"-\")\n\nrepresents a linkable item inside a project documentation, referenced by name. The domain and role take their semantics from the Sphinx project, see Attributes for details on these parameters, as well as priority and dispname. The uri is relative to a project root, which should be the Inventory.root_url of the inventory containing the InventoryItem.\n\nFor convenience, an InventoryItem can also be instantiated from a mapping spec => uri, where spec=\":domain:role:`name`\" borrows from Sphinx' cross-referencing syntax:\n\nitem = InventoryItem(\n    \":domain:role:`name`\" => uri;\n    dispname=<name>,\n    priority=(<domain == \"std\" ? -1 : 1>)\n)\n\nThe domain is optional: if spec=\":role:`name`\", the domain is \"std\" for role=\"label\" or role=\"doc\", and \"jl\" otherwise. The role is mandatory for code objects. For non-code objects,\n\nitem = InventoryItem(\n    \"title\" => uri;\n    dispname=<title>,\n    priority=-1\n)\n\nindicates a link to a section header in the documentation of a project. The name will be a sluggified version of the title, making the item equivalent to item = InventoryItem(\":std:label:`name`\" => uri; dispname=title, priority=-1).\n\nAttributes\n\nname: The object name for referencing. For code objects, this should be the  fully qualified name. For section names, it may be a slugified  version of the section title. It must have non-zero length.\ndomain: The name of a Sphinx domain.  Should be \"jl\" for Julia code objects (default), \"py\" for Python code  objects, and \"std\" for text objects such as section names. Must have  non-zero length, and must not contain whitespace or a colon.\nrole: A domain-specific role (type). Must have nonzero length and not contain whitespace.\npriority: An integer flag for placement in search results. Used when searching in an Inventory, for item access in an Inventory, and with find_in_inventory. The following flag values are supported:\n1: the \"default\" priority. Used by default for all objects not in the \"std\" domain (that is, all \"code\" objects such as those in the \"jl\" domain).\n0: object is important\n2 (or higher): object is unimportant\n-1 (or lower): object is \"hidden\" (may be omitted from search). Used by default for all objects in the std domain (section titles)\nSee find_in_inventory for details. The above semantics match those used by Sphinx.\nuri: A URI for the location of the object's documentation, relative to the location of the inventory file containing the item. Must not contain whitespace. May end with \"$\" to indicate a placeholder for name (usually as \"#$\", for an HTML anchor matching name).\ndispname: A full plain text representation of the object. May be \"-\" if the display name is identical to name (which it should be for code objects). For section titles, this should be the plain text of the title, without formatting, but not slugified.\n\nMethods\n\nuri – Extract the full URI, resolving the $ placeholder and prepending a root_url, if applicable.\ndispname – Extract the dispname, resolving the \"-\" shorthand, if applicable.\nspec – Return the specification string \":domain:role:`name`\" associated with the item\n\n\n\n\n\n","category":"type"},{"location":"api/#DocInventories.auto_mime-Tuple{Any}","page":"API","title":"DocInventories.auto_mime","text":"Determine the MIME type of the given file path or URL from the file extension.\n\nmime = auto_mime(source)\n\nreturns a MIME type from the extension of source. The default mapping is in MIME_TYPES.\n\nUnknown or unsupported extensions throw an ArgumentError.\n\n\n\n\n\n","category":"method"},{"location":"api/#DocInventories.convert-Tuple{Any, Any}","page":"API","title":"DocInventories.convert","text":"Convert an inventory file.\n\nDocInventories.convert(\"objects.inv\", \"inventory.toml\")\n\nconverts the input file \"objects.inv\" in the Sphinx Inventory Format to the TOML Format \"inventory.toml\".\n\nThis is a convenience function to simply load an Inventory from the input file and write it to the output file. Both the input and output file must have known file extensions. The project and version metadata may be given as additional keyword arguments to be written to the output file, see set_metadata.\n\n\n\n\n\n","category":"method"},{"location":"api/#DocInventories.dispname-Tuple{InventoryItem}","page":"API","title":"DocInventories.dispname","text":"Obtain the full display name for an InventoryItem.\n\ndisplay_name = dispname(item)\n\nreturns item.dispname with \"-\" expanded to item.name.\n\n\n\n\n\n","category":"method"},{"location":"api/#DocInventories.find_in_inventory-Tuple{Any, Any}","page":"API","title":"DocInventories.find_in_inventory","text":"Find an item in the inventory.\n\nitem = find_in_inventory(\n    inventory,\n    name;\n    domain=\"\",\n    role=\"\",\n    quiet=false,\n    include_hidden_priority=true\n)\n\nreturns the top priority InventoryItem matching the given name. If the inventory contains no matching item, returns nothing.\n\nArguments\n\ninventory: The Inventory to search.\nname: The value of the name attribute of the InventoryItem to find. Must match exactly.\ndomain: If not empty, restrict search to items with a matching domain attribute.\nrole: If not empty, restrict search to items with a matching role attribute.\nquiet: If false (default), log a warning if the item specification is ambiguous (the top priority item of multiple candidates is returned). If no matching item can be found, an error will be logged in addition to returning nothing.\ninclude_hidden_priority: Whether or not to consider items with a negative priority attribute. If \"hidden\" items are included (default), they are sorted by the absolute value of the priority. That is, items with priority=-1 and priority=1 are considered to be equivalent.\n\nNote that direct item lookup as inventory[spec] where spec is a string of the form \"[:[domain:]role:]`name`\" is available as a simplified way to call find_in_inventory with quiet=true.\n\n\n\n\n\n","category":"method"},{"location":"api/#DocInventories.root_url-Tuple{AbstractString}","page":"API","title":"DocInventories.root_url","text":"Obtain the root url from an inventory source.\n\nurl = root_url(source; warn=true)\n\nreturns the root url as determined by split_url if source starts with \"https://\" or \"http://\", or an empty string otherwise (if source is a local file path). An empty root url will emit a warning unless warn=false.\n\n\n\n\n\n","category":"method"},{"location":"api/#DocInventories.save-Tuple{AbstractString, Any}","page":"API","title":"DocInventories.save","text":"Write the Inventory to file in the specified format.\n\nDocInventories.save(filename, inventory; mime=auto_mime(filename))\n\nwrites inventory to filename in the specified MIME type. By default, the MIME type is derived from the file extension of filename via auto_mime.\n\n\n\n\n\n","category":"method"},{"location":"api/#DocInventories.set_metadata-Tuple{Inventory}","page":"API","title":"DocInventories.set_metadata","text":"Modify the project and version metadata of an inventory or inventory file.\n\nnew_inventory = set_metadata(\n    inventory;\n    version=inventory.version,\n    project=inventory.project\n)\n\nreturns a new Inventory with a modified version and/or project attribute.\n\nset_metadata(\n    filename;\n    mime=auto_mime(filename),\n    project=Inventory(filename).project,\n    version=Inventory(filename).version,\n)\n\nmodifies the project and/or version in the given inventory file (objects.inv, inventory.toml, etc.)\n\n\n\n\n\n","category":"method"},{"location":"api/#DocInventories.show_full-Tuple{InventoryItem}","page":"API","title":"DocInventories.show_full","text":"show_full(item)  # io=stdout\nshow_full(io, item)\n\nis equivalent to\n\nshow(IOContext(io, :full => true), \"text/plain\", item)\n\nand shows the InventoryItem with all attributes.\n\n\n\n\n\n","category":"method"},{"location":"api/#DocInventories.show_full-Tuple{Inventory}","page":"API","title":"DocInventories.show_full","text":"show_full(inventory)  # io=stdout\nshow_full(io, inventory)\n\nis equivalent to\n\nshow(IOContext(io, :limit => false), \"text/plain\", inventory)\n\nand shows the entire inventory without truncating the list of items. This may produce large output, so you may want to make use of the TerminalPager package.\n\n\n\n\n\n","category":"method"},{"location":"api/#DocInventories.spec-Tuple{InventoryItem}","page":"API","title":"DocInventories.spec","text":"Return the specification string of an InventoryItem.\n\nitem_spec = spec(item)\n\nreturns a string of the form \":domain:role:`name`\" using the attributes of the given item.\n\n\n\n\n\n","category":"method"},{"location":"api/#DocInventories.split_url-Tuple{Any}","page":"API","title":"DocInventories.split_url","text":"Split a URL into a root URL and a filename.\n\nroot_url, filename = split_url(url)\n\nsplits url at the last slash. This behaves like splitdir, but operates on URLs instead of file paths. The URL must start with \"https://\" or \"http://\".\n\n\n\n\n\n","category":"method"},{"location":"api/#DocInventories.uri-Tuple{Inventory, Any}","page":"API","title":"DocInventories.uri","text":"uri_str = uri(inventory, key)\n\nis equivalent to uri(inventory[key]; root_url=inventory.root_url).\n\n\n\n\n\n","category":"method"},{"location":"api/#DocInventories.uri-Tuple{InventoryItem}","page":"API","title":"DocInventories.uri","text":"uri_str = uri(item; root_url=\"\")\n\nfully expands item.uri and prepends root_url.\n\n\n\n\n\n","category":"method"},{"location":"formats/#Inventory-File-Formats","page":"Inventory File Formats","title":"Inventory File Formats","text":"","category":"section"},{"location":"formats/","page":"Inventory File Formats","title":"Inventory File Formats","text":"An Inventory object can be be written to disk using the DocInventories.save function in the formats detailed below.","category":"page"},{"location":"formats/","page":"Inventory File Formats","title":"Inventory File Formats","text":"See also DocInventories.MIME_TYPES for file extensions and corresponding MIME types.","category":"page"},{"location":"formats/#Sphinx-Inventory-Format","page":"Inventory File Formats","title":"Sphinx Inventory Format","text":"","category":"section"},{"location":"formats/","page":"Inventory File Formats","title":"Inventory File Formats","text":"The Sphinx inventory format is the format of the objects.inv file that is automatically created for every documentation generated via Sphinx, and, as of Documenter>=1.3.0, for every documentation generated via Documenter.","category":"page"},{"location":"formats/","page":"Inventory File Formats","title":"Inventory File Formats","text":"It is documented extensively as part of the sphobjinv project. In short, the objects.inv file starts with a four-line plain text header of the form","category":"page"},{"location":"formats/","page":"Inventory File Formats","title":"Inventory File Formats","text":"# Sphinx inventory version 2\n# Project: <project>\n# Version: <version>\n# The remainder of this file is compressed using zlib.","category":"page"},{"location":"formats/","page":"Inventory File Formats","title":"Inventory File Formats","text":"As indicated in the header, the remainder of the file contains compressed data containing the information about each inventory item. The uncompressed equivalent is described as the Plain Text Format.","category":"page"},{"location":"formats/#Plain-Text-Format","page":"Inventory File Formats","title":"Plain Text Format","text":"","category":"section"},{"location":"formats/","page":"Inventory File Formats","title":"Inventory File Formats","text":"DocInventories (like sphobjinv) can remove the compression of the objects.inv file, storing a plain text version of the objects.inv in a .txt format.","category":"page"},{"location":"formats/","page":"Inventory File Formats","title":"Inventory File Formats","text":"It has the same four-line header as the Sphinx Inventory Format (up to a small variation in the fourth line to indicate that the file is no longer compressed). Then, for each InventoryItem, it contains a single line of the form","category":"page"},{"location":"formats/","page":"Inventory File Formats","title":"Inventory File Formats","text":"<name> <domain>:<role> <priority> <uri> <dispname>","category":"page"},{"location":"formats/","page":"Inventory File Formats","title":"Inventory File Formats","text":"Note that DocInventories internally uses the text/x-intersphinx MIME type for the .txt extension, as text/plain is used for the plain text representation of the Inventory object in the Julia REPL (what you see when you type display(inventory)).","category":"page"},{"location":"formats/#TOML-Format","page":"Inventory File Formats","title":"TOML Format","text":"","category":"section"},{"location":"formats/","page":"Inventory File Formats","title":"Inventory File Formats","text":"The TOML format is a text output format that is optimized for human readability. The format is unique to the DocInventories package. It starts with a header section of the form","category":"page"},{"location":"formats/","page":"Inventory File Formats","title":"Inventory File Formats","text":"# DocInventory version 1\nproject = \"<project>\"\nversion = \"<version>\"","category":"page"},{"location":"formats/","page":"Inventory File Formats","title":"Inventory File Formats","text":"The comment in the first line is mandatory and identifies the file as containing inventory data in the format described here.","category":"page"},{"location":"formats/","page":"Inventory File Formats","title":"Inventory File Formats","text":"The project line must specify the name of the project described by the inventory. It is mandatory. The version line may specify the version of the project. It is optional, but recommended.","category":"page"},{"location":"formats/","page":"Inventory File Formats","title":"Inventory File Formats","text":"After that, each InventoryItem is represented by a multi-line block of the form","category":"page"},{"location":"formats/","page":"Inventory File Formats","title":"Inventory File Formats","text":"[[<domain>.<role>]]\nname = \"<name>\"\nuri = \"<uri>\"\ndispname = \"<dispname>\"\npriority = <priority>","category":"page"},{"location":"formats/","page":"Inventory File Formats","title":"Inventory File Formats","text":"The four lines for name, uri, dispname, and priority may occur in any order. Also, for items with the default priority (-1 for the std domain, 1 otherwise), the priority line may be omitted. If dispname is equal to name (usually indicated by dispname=\"-\"), the dispname line may also be omitted.","category":"page"},{"location":"formats/","page":"Inventory File Formats","title":"Inventory File Formats","text":"The item-blocks may be grouped/separated by blank lines. In .toml files generated by DocInventories.save(\"inventory.toml\", inventory) items will be grouped into blocks with the same [[<domain>.<role>]] with a blank line between each block.","category":"page"},{"location":"formats/","page":"Inventory File Formats","title":"Inventory File Formats","text":"Any TOML parser should read a .toml file with the above structure into a nested dictionary, so that item_dict = toml_data[domain][role][i] corresponds to the i'th inventory item with the given domain and role. That item_dict will then map \"name\", \"uri\", and potentially \"dispname\" and \"priority\" to their respective values.","category":"page"},{"location":"formats/","page":"Inventory File Formats","title":"Inventory File Formats","text":"A compressed TOML file can be written with, e.g., DocInventories.save(\"inventory.toml.gz\", inventory). With compression, the size of the file should be comparable (albeit slightly larger) than the compressed objects.inv format.","category":"page"},{"location":"formats/#Size-Comparison","page":"Inventory File Formats","title":"Size Comparison","text":"","category":"section"},{"location":"formats/","page":"Inventory File Formats","title":"Inventory File Formats","text":"In the following table, we compare the size of the inventory file of different projects in kilobytes, for the various output formats.","category":"page"},{"location":"formats/","page":"Inventory File Formats","title":"Inventory File Formats","text":"using DocInventories\nusing DocumenterInterLinks\nusing Markdown\nusing DataFrames\nusing PrettyTables\n\ninv = InterLinks(\n    \"Documenter\" => \"https://documenter.juliadocs.org/stable/objects.inv\",\n    \"Julia\" => (\n        \"https://docs.julialang.org/en/v1/\",\n        joinpath(@__DIR__, \"inventories\", \"Julia.toml\")\n    ),\n    \"Matplotlib\" => \"https://matplotlib.org/stable/objects.inv\",\n    \"Python\" => \"https://docs.python.org/3/objects.inv\",\n)\n\nprojects = collect(keys(inv))\nformats = [\".txt\", \".toml\", \".inv\", \".toml.gz\"]\ndata = (\n    \"project\" => String[],\n    \"objects\" => Int64[],\n    [format => String[] for format in formats]...\n)\n\nmktempdir() do tempdir\n    for name in projects\n        push!(data[1][2], name)\n        push!(data[2][2], length(inv[name]))\n        for (i, format) in enumerate(formats)\n            filename = joinpath(tempdir, name*format)\n            DocInventories.save(filename, inv[name])\n            kB = float(filesize(filename)) / 1024.0\n            push!(data[i+2][2], \"$(round(kB; digits=1)) kB\")\n        end\n    end\nend\n\n\ntable = pretty_table(\n    String,\n    DataFrame(data...);\n    header=[\"Project\", \"No. of Objects\", formats...],\n    backend = Val(:markdown),\n)\n\nMarkdown.parse(table)","category":"page"},{"location":"usage/#Usage","page":"Usage","title":"Usage","text":"","category":"section"},{"location":"usage/#Loading-Inventories","page":"Usage","title":"Loading Inventories","text":"","category":"section"},{"location":"usage/","page":"Usage","title":"Usage","text":"An Inventory object can be instantiated from the URL of an inventory file. For projects whose documentation is generated via Documenter (most Julia projects) or Sphinx (most Python projects), the inventory file should be objects.inv in the root of the online documentation. For example, the inventory file for the popular Python matplotlib library would be loaded as","category":"page"},{"location":"usage/","page":"Usage","title":"Usage","text":"using DocInventories\ninventory = Inventory(\"https://matplotlib.org/3.7.3/objects.inv\")","category":"page"},{"location":"usage/","page":"Usage","title":"Usage","text":"To load an inventory from a local file, instantiate Inventory with the path to the file and a root_url:","category":"page"},{"location":"usage/","page":"Usage","title":"Usage","text":"inventory = Inventory(\n    joinpath(@__DIR__, \"inventories\", \"Julia.toml\"),\n    root_url=\"https://docs.julialang.org/en/v1/\"\n)","category":"page"},{"location":"usage/#Inventory-Items","page":"Usage","title":"Inventory Items","text":"","category":"section"},{"location":"usage/","page":"Usage","title":"Usage","text":"Each Inventory is a collection of InventoryItem objects. We can iterate over these, or look up a particular item with a numerical index or a specification like","category":"page"},{"location":"usage/","page":"Usage","title":"Usage","text":"item = inventory[\"Style-Guide\"]","category":"page"},{"location":"usage/","page":"Usage","title":"Usage","text":"Conceptually, as indicated above, the inventory item maps a spec to a uri relative to the root_url associated with the Inventory containing the item.","category":"page"},{"location":"usage/","page":"Usage","title":"Usage","text":"The spec in the mapping adopts the notation of a \"domain\" and \"role\" from Sphinx:","category":"page"},{"location":"usage/","page":"Usage","title":"Usage","text":"DocInventories.show_full(inventory[\"Style-Guide\"])","category":"page"},{"location":"usage/","page":"Usage","title":"Usage","text":"This makes spec reminiscent of the Sphinx cross-referencing syntax[1]. When looking up an item, the domain and role part of the specification are optional and serve for disambiguation. The above item could also have been obtained with inventory[:label:`Style Guide`] or inventory[:std:label:`Style Guide`].","category":"page"},{"location":"usage/","page":"Usage","title":"Usage","text":"[1]: We conflate Sphinx' \"object types\" and \"roles\". Technically, a Sphinx domain (like the Python py domain) has object types (e.g., function) which in turn have one or more associated roles that are used when referencing the object (e.g., func). DocInventories has no formal definition of domains/types/roles, so it considers types and roles identical. Consequently, a Sphinx reference \":py:func:`matplotlib.pyplot.subplots`\" would correspond to the DocInventories spec \":py:function:`matplotlib.pyplot.subplots`\".","category":"page"},{"location":"usage/#Exploring-Inventories","page":"Usage","title":"Exploring Inventories","text":"","category":"section"},{"location":"usage/","page":"Usage","title":"Usage","text":"An Inventory instance is a callable that takes a search and returns a list of InventoryItems that match the search. This is quite flexible, and takes a string or regular expression that will be compared both against the spec and the full string representation (repr(item; context=(:full => true))) of each item.","category":"page"},{"location":"usage/","page":"Usage","title":"Usage","text":"Thus, we could search for a title as is appears in the documentation:","category":"page"},{"location":"usage/","page":"Usage","title":"Usage","text":"inventory(\"Sorting and Related Functions\")","category":"page"},{"location":"usage/","page":"Usage","title":"Usage","text":"Or, with a regular expression, for all Julia functions in Base that have sort in their name:","category":"page"},{"location":"usage/","page":"Usage","title":"Usage","text":"inventory(r\":function:`Base\\..*sort.*`\")","category":"page"},{"location":"usage/","page":"Usage","title":"Usage","text":"Or, for all linkable items that appear on the page with the relative URI \"manual/workflow-tips/\"","category":"page"},{"location":"usage/","page":"Usage","title":"Usage","text":"inventory(\"manual/workflow-tips/\")","category":"page"},{"location":"usage/","page":"Usage","title":"Usage","text":"The search results will be sorted taking into account the priority field of the items.","category":"page"},{"location":"usage/#Manipulating-Inventories","page":"Usage","title":"Manipulating Inventories","text":"","category":"section"},{"location":"usage/","page":"Usage","title":"Usage","text":"Inventory objects are immutable, with the exception that new InventoryItems can be added to an existing Inventory using push! and append!.","category":"page"},{"location":"usage/","page":"Usage","title":"Usage","text":"Beyond that, DocInventories.set_metadata can modify the metadata (project and version) both of an Inventory object and an inventory file on disk, but the operation is in-place only for files.","category":"page"},{"location":"usage/","page":"Usage","title":"Usage","text":"These tools are primarily intended to tweak the inventories automatically generated by Documenter.makedocs, e.g., to set a custom version for a dev-release (alternatively to the inventory_version option in Documenter.HTMLWriter.HTML in Documenter >= 1.3.0), or to use a different project name than the standard project in makedocs. These modifications should be made after the call to Documenter.makedocs, but before Documenter.deploydocs.","category":"page"},{"location":"usage/#Saving-Inventories-to-File","page":"Usage","title":"Saving Inventories to File","text":"","category":"section"},{"location":"usage/","page":"Usage","title":"Usage","text":"An inventory can be written to file using the DocInventories.save function. For example, to write the inventory in TOML Format, use","category":"page"},{"location":"usage/","page":"Usage","title":"Usage","text":"DocInventories.save(\"$(tempname()).toml\", inventory)","category":"page"},{"location":"usage/","page":"Usage","title":"Usage","text":"The MIME type is derived from the extension of the file name, according to the mapping in DocInventories.MIME_TYPES. The MIME-type can also be passed explicitly to save, independent of the file name:","category":"page"},{"location":"usage/","page":"Usage","title":"Usage","text":"DocInventories.save(tempname(), inventory; mime=\"application/toml\")","category":"page"},{"location":"usage/","page":"Usage","title":"Usage","text":"It is also possible to write with compression by appending a .gz file extension:","category":"page"},{"location":"usage/","page":"Usage","title":"Usage","text":"DocInventories.save(\"$(tempname()).toml.gz\", inventory)","category":"page"},{"location":"usage/","page":"Usage","title":"Usage","text":"See Inventory File Formats for a description of all available output formats.","category":"page"},{"location":"creating/#Creating-Inventory-Files","page":"Creating Inventory Files","title":"Creating Inventory Files","text":"","category":"section"},{"location":"creating/","page":"Creating Inventory Files","title":"Creating Inventory Files","text":"In general, inventory files should be generated automatically by Documenter or Sphinx. However, there are situations where producing an inventory file \"by hand\" make sense:","category":"page"},{"location":"creating/","page":"Creating Inventory Files","title":"Creating Inventory Files","text":"A project does not provide an inventory file. Maybe its documentation is entirely in its Github README file.\nCreating an inventory file for convenient linking to a website other than a project documentation. For example, one could create an inventory of (select) Wikipedia pages.","category":"page"},{"location":"creating/","page":"Creating Inventory Files","title":"Creating Inventory Files","text":"There are two ways to accomplish this:","category":"page"},{"location":"creating/","page":"Creating Inventory Files","title":"Creating Inventory Files","text":"Populate an Inventory in the REPL\nMaintain an Inventory TOML File by Hand","category":"page"},{"location":"creating/#Populate-an-Inventory-in-the-REPL","page":"Creating Inventory Files","title":"Populate an Inventory in the REPL","text":"","category":"section"},{"location":"creating/","page":"Creating Inventory Files","title":"Creating Inventory Files","text":"We can instantiate an empty Inventory as","category":"page"},{"location":"creating/","page":"Creating Inventory Files","title":"Creating Inventory Files","text":"using DocInventories\n\ninventory = Inventory(\n    project=\"Wikipedia\",\n    version=\"2024-01\",\n    root_url=\"https://en.wikipedia.org/wiki/\"\n);\nnothing # hide","category":"page"},{"location":"creating/","page":"Creating Inventory Files","title":"Creating Inventory Files","text":"Then, we can push! new InventoryItems for all pages we want to include in the inventory:","category":"page"},{"location":"creating/","page":"Creating Inventory Files","title":"Creating Inventory Files","text":"push!(\n    inventory,\n    InventoryItem(\n        \":std:doc:Julia\" => \"Julia_(programming_language)\";\n        dispname=\"Julia (programming language)\"\n    ),\n    InventoryItem(\n        \":std:doc:Python\" => \"Python_(programming_language)\";\n        dispname=\"Python (programming language)\"\n    )\n)","category":"page"},{"location":"creating/","page":"Creating Inventory Files","title":"Creating Inventory Files","text":"We've used here the role :std:doc: for \"documents\", which is somewhat optional, but semantically more accurate than the default \":std:label:\" role for a section within a document. In any case, as shown in Usage, items can be looked without referring to the domain or role:","category":"page"},{"location":"creating/","page":"Creating Inventory Files","title":"Creating Inventory Files","text":"inventory[\"Julia\"]","category":"page"},{"location":"creating/","page":"Creating Inventory Files","title":"Creating Inventory Files","text":"Once the inventory is complete, we can write it to disk, see Saving Inventories to File.","category":"page"},{"location":"creating/","page":"Creating Inventory Files","title":"Creating Inventory Files","text":"DocInventories.save(\"$(tempname()).toml\", inventory)","category":"page"},{"location":"creating/#Maintain-an-Inventory-TOML-File-by-Hand","page":"Creating Inventory Files","title":"Maintain an Inventory TOML File by Hand","text":"","category":"section"},{"location":"creating/","page":"Creating Inventory Files","title":"Creating Inventory Files","text":"Alternatively, we could just write a TOML inventory file by hand, in our favorite text editor. For the above inventory, the file should contain","category":"page"},{"location":"creating/","page":"Creating Inventory Files","title":"Creating Inventory Files","text":"show(stdout, \"application/toml\", inventory)","category":"page"},{"location":"creating/","page":"Creating Inventory Files","title":"Creating Inventory Files","text":"The requirements for the file are in the description of the TOML Format, but should be fairly intuitive.","category":"page"},{"location":"creating/","page":"Creating Inventory Files","title":"Creating Inventory Files","text":"In general, custom inventory files should be stored as an uncompressed .toml file. This makes them much easier to maintain with a text editor. In addition, these inventories will presumably be checked into a git repository, which will be much more efficient with uncompressed (diffable!) text-based files.","category":"page"},{"location":"creating/","page":"Creating Inventory Files","title":"Creating Inventory Files","text":"In contrast, inventories that are deployed (put online so that other projects may download them to resolve links) should always be compressed, either as an objects.inv file or as an inventory.toml.gz file.","category":"page"},{"location":"#DocInventories.jl","page":"Home","title":"DocInventories.jl","text":"","category":"section"},{"location":"","page":"Home","title":"Home","text":"using Markdown\nusing Pkg\n\nVERSION = Pkg.dependencies()[Base.UUID(\"43dc2714-ed3b-44b5-b226-857eda1aa7de\")].version\n\ngithub_badge = \"[![Github](https://img.shields.io/badge/JuliaDocs-DocInventories.jl-blue.svg?logo=github)](https://github.com/JuliaDocs/DocInventories.jl)\"\n\nversion_badge = \"![v$VERSION](https://img.shields.io/badge/version-v$(replace(\"$VERSION\", \"-\" => \"--\"))-green.svg)\"\n\nif get(ENV, \"DOCUMENTER_BUILD_PDF\", \"\") == \"\"\n    Markdown.parse(\"$github_badge $version_badge\")\nelse\n    Markdown.parse(\"\"\"\n    -----\n\n    On Github: [JuliaDocs/DocInventories.jl](https://github.com/JuliaDocs/DocInventories.jl)\n\n    Version: $VERSION\n\n    -----\n\n    \"\"\")\nend","category":"page"},{"location":"","page":"Home","title":"Home","text":"DocInventories.jl is a package for reading and writing inventory files such as the objects.inv file written by Documenter.jl ≥ v1.3.0 and Sphinx.","category":"page"},{"location":"","page":"Home","title":"Home","text":"These inventory files are used by DocumenterInterLinks.jl and InterSphinx to enable linking between the documentation of two projects.","category":"page"},{"location":"","page":"Home","title":"Home","text":"The DocInventories package also allows to convert the objects.inv format to an inventory.toml format that is designed to be human-readable and to allow maintaining custom inventories by hand. The package is intended for use in the REPL, to interactively explore inventory files, and as a backend for DocumenterInterLinks.","category":"page"},{"location":"#Installation","page":"Home","title":"Installation","text":"","category":"section"},{"location":"","page":"Home","title":"Home","text":"As usual, that package can be installed via","category":"page"},{"location":"","page":"Home","title":"Home","text":"] add DocInventories","category":"page"},{"location":"","page":"Home","title":"Home","text":"in the Julia REPL, or by adding","category":"page"},{"location":"","page":"Home","title":"Home","text":"DocInventories = \"43dc2714-ed3b-44b5-b226-857eda1aa7de\"","category":"page"},{"location":"","page":"Home","title":"Home","text":"to the relevant Project.toml file.","category":"page"},{"location":"#Contents","page":"Home","title":"Contents","text":"","category":"section"},{"location":"","page":"Home","title":"Home","text":"Pages = [page for (name, page) in Main.PAGES[2:end]]","category":"page"},{"location":"#Changelog","page":"Home","title":"Changelog","text":"","category":"section"},{"location":"","page":"Home","title":"Home","text":"The DocInventories project follows Semantic Versioning. You can find a CHANGELOG for versions after v1.0 online.","category":"page"},{"location":"#Related-Projects","page":"Home","title":"Related Projects","text":"","category":"section"},{"location":"","page":"Home","title":"Home","text":"Documenter.jl — The default documentation generator in the Julia ecosystem. As of version 1.3.0, Documenter automatically generates and deploys a (Sphinx-format) objects.inv file that enables linking into a project's documentation.\nDocumenterInterLinks.jl – A plugin for Documenter to enable linking to any other project that has an inventory file, i.e., any project using a recent version of Documenter to build its documentation, or any project using Sphinx. It is the Julia-equivalent of Sphinx' Intersphinx plugin.\nSphinx – The default documentation generator in the Python ecosystem. Sphinx originated the objects.inv inventory file format now also generated for Julia projects by Documenter.\nsphobjinv – The Python-equivalent of this project, allowing to read, explore and manipulate the data in objects.inv inventory file. Note that this does not include support for the inventory.toml format, which is unique to DocInventories.","category":"page"}]
}