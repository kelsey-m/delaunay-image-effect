import DelaunayTriangulate from "delaunay-triangulate";

/* ------------------------------

	Delaunay Image Effect

	breaks the image into delaunay triangles
	around the user's mouse 
	scales the images of each triangle
	at different rates to create a fluid,
	3d-like effect

	May add strokes and refine the effect in the future

	uses Delaunay Triangulation API
	here: https://github.com/mikolalysenko/delaunay-triangulate
	to generate the Delaunay triangles,
	given the input of random points
	around the users mouse position

	uses Paper.js for easy 2D path handling
	of the triangles - the triangles clip 
	the image

---------------------------------- */

class DelaunayImageEffect{

	//--------------------------------- declareConstants
	declareConstants(){
		this.TRIANGLE_GROUP_POOL_SIZE	= 30;
		this.MOUSE_POINT_RADIUS			= 50;
		this.NUM_RANDOM_PTS				= 300;
		//should be an even number
		//as iterations will be split 
		//evenly between scaling up 
		//and scaling down 
		this.NUM_ANIM_ITERATIONS		= 16;
	}

	//--------------------------------- initVars
	initVars(){
		// the index of the current image
		// (so that we can add multiple images
		// and swap them out on some user input)
		this.cur_image_ind				= -1;
		// the pool that holds the rasters
		this.triangleGroups 			= [];
		this.animatingTriangleGroups	= [];
	}

	//params can be an array of strings or 
	//a string representing the images or the image
	//--------------------------------- constructor
	constructor(stage_element, images){
		//if string convert to array
		if(typeof images === 'string') images = [images];
		this.images = images || [];

		this.declareConstants();
		this.initVars();

		this.stage_element = stage_element;
		if(this.stage_element) paper.setup(this.stage_element);
	}

	//--------------------------------- init 
	init(onLoaded){
		this.onLoaded = onLoaded;
		//begin to load the image(s)
		this.loadNextImage();

		paper.view.onResize = this.onResize.bind(this);
		paper.view.onMouseMove = this.onMouseMove.bind(this);
		paper.view.onFrame = this.onFrame.bind(this);
	}

	//--------------------------------- loadNextImage
	loadNextImage(){
		this.cur_image_ind++;
		if(this.cur_image_ind >= this.images.length) this.cur_image_ind = 0;
		this.loadImage(this.cur_image_ind);
	}

	//--------------------------------- loadImage
	loadImage(ind){
		this.raster = new paper.Raster(this.images[ind]);
		this.raster.on("load", this.onImageLoaded.bind(this));
	}

	//--------------------------------- onImageLoaded
	onImageLoaded(){
		if(this.onLoad) this.onLoad();
		this.onResize();

		this.raster_width = this.raster.bounds.width;
		this.raster_height = this.raster.bounds.height;

		/// create the delaunay triangles
		// by generating random points
		// that spread accross the width 
		// of the stage
		this.createTriangles();

		//create the initial pool of groups 
		//that will be contain with the triangles
		//and rsaters that willl be clipped by the triangles
		this.createTriangleGroups();
	}

	//--------------------------------- onResize
	onResize(event){
		var raster;

		this.raster.fitBounds(paper.view.bounds, true);
		this.raster.position = paper.view.center;
		this.raster_width = this.raster.bounds.width;
		this.raster_height = this.raster.bounds.height;

		//want to fit bounds for all rasters
		//and redraw the triangles
		for(var i=0;i<this.triangleGroups.length; i++){
			//pdate the 2nd child which will be the raster
			raster = this.triangleGroups[i].group.children[1];
			raster.fitBounds(paper.view.bounds, true);
			raster.position = paper.view.center;
		}
	}

	//--------------------------------- onFrame
	onFrame(event){
	
		//for each group of triangle groups
		//for each mouseMove
		//check the iteration of its anim here
		//each triangle will have a unique current 
		//scale

		//want to know max scale for each 
		//traingle - increment value will be
		//based on this and the current iteration
		//for this group of triangle groups

		//will have a constant duration for the animations
		//(depending on the rate of onFrame firing)

		var group, scale, scale_factor;

		if( !this.animatingTriangleGroups.length ) return;

		//traverse animatingTriangleGroups to 
		//apply scale animation
		for(var i=0;i<this.animatingTriangleGroups.length;i++){
			//set the width and the height 
			//of the 2nd child to the correct scale
			//determine the scale from the iteration
			//and the destination scale (max_scale)
			group = this.triangleGroups[this.animatingTriangleGroups[i].index].group;
			//if index is less than NUM_ANIM_ITERATIONS
			//scale is increasing
			//otherwise scale is decreaing
			scale_factor = (this.animatingTriangleGroups[i].max_scale -1)/(this.NUM_ANIM_ITERATIONS/2);

			if(this.animatingTriangleGroups[i].iteration < (this.NUM_ANIM_ITERATIONS/2))
				scale = ( scale_factor*this.animatingTriangleGroups[i].iteration ) + 1;
			else  
				scale = this.animatingTriangleGroups[i].max_scale - 
						( scale_factor*(this.animatingTriangleGroups[i].iteration-(this.NUM_ANIM_ITERATIONS/2)) );
				

			this.animatingTriangleGroups[i].scale = scale;
			this.animatingTriangleGroups[i].iteration++;

			group.children[1].bounds.width = this.raster_width*scale;
			group.children[1].bounds.height = this.raster_height*scale;
			group.children[1].position = paper.view.center;
			
			//if reached max_scale	
			//remove from array for now to test
			if(this.animatingTriangleGroups[i].iteration > this.NUM_ANIM_ITERATIONS){
				this.animatingTriangleGroups.splice(i, 1);
			}
		}
	}

	//--------------------------------- onMouseMove
	onMouseMove(mouseEvent){
		var self = this;
		clearTimeout(mouseMoveTimeout);
		var mouseMoveTimeout = setTimeout(function(){
			//get the mouse point
			self.animateTrianglesAroundPoint(mouseEvent.point);
		}, 60);
	}

	//--------------------------------- createTriangles
	createTriangles(){
		// create the delaunay triangles
		// by generating random points
		// that spread accross the width 
		// of the stage
		var pts = this.getRandomPoints( paper.view.bounds.width, 
										paper.view.bounds.height );

		this.generateTrianglesByPoints(pts);
	}

	//--------------------------------- getRandomPoints
	getRandomPoints(width, height){
		var pt_x, pt_y;
		var pts = [];

		for(var i=0; i<this.NUM_RANDOM_PTS; i++){
			//create random x and y points
			pt_x = Math.round(Math.random()*width);
			pt_y = Math.round(Math.random()*height);

			pts.push([pt_x, pt_y]);
		}

		//also make sure that you have randompoints
		//along all 4 edges to make the triangles
		//otherwise you will have triangles with etreme
		//dimensions as well as only a few triangles
		//along the etremities 

		//top edge
		for(i=0;i<20;i++){
			pt_x = Math.round(Math.random()*width);
			pt_y = 0;
			pts.push([pt_x, pt_y]);
		}
		//bottom edge
		for(i=0;i<20;i++){
			pt_x = Math.round(Math.random()*width);
			pt_y = paper.view.bounds.height;
			pts.push([pt_x, pt_y]);
		}
		//left edge
		for(i=0;i<10;i++){
			pt_x = 0;
			pt_y = Math.round(Math.random()*height);
			pts.push([pt_x, pt_y]);
		}
		//right edge
		for(i=0;i<10;i++){
			pt_x = paper.view.bounds.width;
			pt_y = Math.round(Math.random()*height);
			pts.push([pt_x, pt_y]);
		}

		return pts;
	}

	//--------------------------------- createTriangles
	generateTrianglesByPoints(pts){
		// create the delaunay triangles
		// around based on the pts
		var triangles = DelaunayTriangulate(pts);

		//create the actual triangle paths
		this.triangles = this.createTrianglePaths(pts, triangles);
	}

	//--------------------------------- createTrianglePaths
	createTrianglePaths(pts, triangles){
		var triangle_paths = [];
		var trianglePath;
		var trianglePathInfo;
		var triangle_pts;

		//triangles are the indices 
		//of your pts - so draw the path
		//of each triangle by adding its
		//points to a Path
		for(var i=0;i<triangles.length;i++){
			trianglePath = new paper.Path();
			triangle_pts = [
				new paper.Point(pts[triangles[i][0]][0], pts[triangles[i][0]][1]),
				new paper.Point(pts[triangles[i][1]][0], pts[triangles[i][1]][1]),
				new paper.Point(pts[triangles[i][2]][0], pts[triangles[i][2]][1])
			];
			trianglePath.segments = [];
			trianglePath.add(triangle_pts[0]);
			trianglePath.add(triangle_pts[1]);
			trianglePath.add(triangle_pts[2]);
			trianglePath.closed = true;
			trianglePath.strokeColor = 'white';

			//perhaps create an obj here with the points
			//to make the checking of points against radius
			//less expensive than checking againt the path
			//segment points
			trianglePathInfo = {
				path: trianglePath,
				points: triangle_pts
			}
			triangle_paths.push(trianglePathInfo);
		}

		return triangle_paths;
	}

	//--------------------------------- createTriangleGroups
	createTriangleGroups(){
		//create the clipping group for
		var group;

		for(var i=0;i<this.triangles.length;i++){
			//create a copy of the raster
			group = this.createNewTriangleGroup(this.triangles[i].path, this.raster.clone());
			this.triangleGroups.push({
				group: group,
				points: this.triangles[i].points,
				index: i
			});
		}
	}

	//--------------------------------- createNewTriangleGroup
	createNewTriangleGroup(triangle, raster){
		raster.position = paper.view.center;
		raster.fitBounds(paper.view.bounds, true);

		var group = new paper.Group([
			triangle,
			raster
		]);

		group.clipped = true;

		return group;
	}

	//--------------------------------- animateTrianglesAroundPoint
	animateTrianglesAroundPoint(pt){
		this.animateTriangleGroups(pt);
	} 

	//--------------------------------- setCurTriangleGroups
	setCurTriangleGroups(pt){
		if(!this.triangles || !this.triangles.length) return;
		//create the clipping group for
		//each triangle that is within the MOUSE_POINT_RADIUS
		var clippping_triangles = this.determineClippingTriangles(pt);
		var group;
		var raster;

		for(var i=0;i<clippping_triangles.length;i++){
			group = this.getTriangleGroup();
			if( !group ) return;
			//now add the triangle path
			//to the group
			//and set it to clipped
			raster = group.children[0];
			group.removeChildren();
			group.addChildren([clippping_triangles[i].path, raster]);
			group.clipped = true;
			raster.visible = true;

			this.curTriangleGroups.push(group);
			this.animateTriangleGroup(group);
		}
	}

	//--------------------------------- animateTriangleGroups
	animateTriangleGroups(pt){
		var groups = this.determineMouseAdjacentGroups(pt);

		for(var i=0;i<groups.length;i++){
			this.animateTriangleGroup(groups[i].index, groups[i].group);
		}
	}

	//--------------------------------- animateTriangleGroup
	animateTriangleGroup(index, group){
		//need to save the group info in the
		//animatingGroups array
		
		//need to save...
		//index, max_scale and the current
		//iteration of the animation
		var max_scale = 1.3 + Math.random()*0.4;
		var is_animating = false;

		//if a group with this index alreday exists
		//do not add it
		for(var i=0;i<this.animatingTriangleGroups.length;i++){
			if(this.animatingTriangleGroups[i].index == index){
				is_animating = true;	
				break;
			}
		}

		if(is_animating) return; 

		this.animatingTriangleGroups.push({
			index: index,
			scale: 1,
			max_scale: max_scale,
			iteration: 0
		});
	}

	//--------------------------------- determineMouseAdjacentGroups
	determineMouseAdjacentGroups(pt){
		//so first find the triangles within
		//the radius
		var groups = [];
		//if any  of the triangle is
		//within the radius
		//add it to the array
		
		//check each triangle's bounds
		//(not really radius -- would need to 
		//calculate distance from point to eaach triangle point
		//to check if within true radius)
		var is_within;
		for(var i=0;i<this.triangleGroups.length;i++){
			is_within = false;
			for(var j=0;j<this.triangleGroups[i].points.length;j++){

				if( this.triangleGroups[i].points[j].x >= (pt.x-this.MOUSE_POINT_RADIUS) &&
					this.triangleGroups[i].points[j].x <= (pt.x+this.MOUSE_POINT_RADIUS) &&
					this.triangleGroups[i].points[j].y >= (pt.y-this.MOUSE_POINT_RADIUS) &&
					this.triangleGroups[i].points[j].y <= (pt.y+this.MOUSE_POINT_RADIUS) ) is_within = true;
			}	
			if(is_within) groups.push(this.triangleGroups[i]);
		}
		return groups;
	}

	//--------------------------------- getTriangleGroup
	getTriangleGroup(){
		// If need a new group and 
		// no raster is in the pool
		// create a new one
		// push from and pop to the pool as needed
		var group = this.triangleGroupPool.length > 0 ? 
				 this.triangleGroupPool.pop() :
				 this.createNewTriangleGroup(this.raster.clone());
		return group;
	}

	//--------------------------------- startDemo
	startDemo(){
	}

}

export default DelaunayImageEffect;

