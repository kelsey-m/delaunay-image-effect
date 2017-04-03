# Delaunay Image Effect

----
> Breaks image(s) into Delaunay Triangles and animates them on mouse move.  May add easing and shading in the future.

**Install**

>

    npm install delaunay-image-effect

**Usage**

>

    import DelaunayImageEffect from 'delaunay-image-effect';

    // canvas element required
    var canvas = document.getElementById("my_canvas");

    var img_src = "/assets/my-image.jpg";

    var delaunayImageEffect = new DelaunayImageEffect(canvas, img_src);


**Initialize the Effect**

>

    // optional image loaded callback
    var onImgLoaded = function(){ doSomething(); };

    // optional mouse_enabled arg 
    // true by default
    // since the effect is not yet optimized for mobile
    // you can disable the mouse effect altogether when need be
    var mouse_enabled = true;
    
    // initialize the effect
    delaunayImageEffect.init(onImgLoaded, mouse_enabled);




