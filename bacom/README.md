# Bacom bulk updates folder
> This folder is for all bacom related content migration and managment

## Docs: 
The docs folder should be where all of your ouput docs go. If you need a folder structure
you can use `fs` to make folders as you go. 

## Path Files:
This is a place to store files that contain objects or arrays of paths to hit when bulk 
updating. These should not be stored in git since they update as content updates. 

## Test docs:
When working with md2docx, it is sometimes nice to have a subset of files to do quick
iterations on. This folder is for those local docs, and will not be saved in git. 