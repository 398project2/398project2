import json

def graph():
    json_data=open('conx.json')
    data = json.load(json_data)

    graph = {}
    nodeList = []
    linksList = []

    conxList = []

    # add nodes
    for i in data:
        conx = data[str(i)]

        areaList = []

        for j in conx:
            area = conx[str(j)]
            if not area in areaList:
                areaList.append(area)

            for k in xrange(len(area)):
                course = area[k].replace("-"," ").encode("utf-8")
                
                newNode = {}
                newNode.update({"name":course})
                if not newNode in nodeList:
                    nodeList.append(newNode)

                department = course[0:course.index(" ")]

                newNode = {}
                newNode.update({"name":department})
                if not newNode in nodeList:
                    nodeList.append(newNode)
            if not areaList in conxList:
                conxList.append(areaList)

    graph.update({"nodes":nodeList})

    # add links - departments
    for i in xrange(len(nodeList)):
        if len(nodeList[i]["name"]) > 5:
            department = nodeList[i]["name"].split(' ', 1)[0]

            endNode = {}
            endNode.update({"name":department})

            sourceLocation = nodeList.index(nodeList[i])
            targetLocation = nodeList.index(endNode)

            newLink = {}
            newLink.update({"source":sourceLocation})
            newLink.update({"target":targetLocation})

            linksList.append(newLink)

    # add links - course connections
    for i in xrange(len(conxList)):
        conx = conxList[i]

        for j in xrange(len(conx)-1):

            for m in xrange(len(conx[j])):
                for n in xrange(len(conx[j+1])):
                    startNode = {}
                    startNode.update({"name":conx[j][m].replace("-"," ").encode("utf-8")})

                    endNode = {}
                    endNode.update({"name":conx[j+1][n].replace("-"," ").encode("utf-8")})

                    sourceLocation = nodeList.index(startNode)
                    targetLocation = nodeList.index(endNode)

                    newLink = {}
                    newLink.update({"source":sourceLocation})
                    newLink.update({"target":targetLocation})
                    linksList.append(newLink)

    graph.update({"links":linksList})

    with open('graph.json', 'w') as outputFile:
        outputFile.write(json.dumps(graph))

    json_data.close()

    return nodeList
    


def connection(nodeList):
    json_conx_data=open('graph.json')
    conx_data = json.load(json_conx_data)

    conx_dictionary = {}
    for course_title in conx_data["nodes"]:
        course_conx_list = []
        location = nodeList.index(course_title)
        for conx_link in conx_data["links"]:
            if(location == conx_link["source"]):
                lookup_conx = conx_link["target"]
                conx_course = nodeList[lookup_conx]["name"]
                if (len(conx_course) > 5) and (conx_course not in course_conx_list):
                    course_conx_list.append(conx_course)

            if(location == conx_link["target"]):
                lookup_conx = conx_link["source"]
                conx_course = nodeList[lookup_conx]["name"]
                if (len(conx_course) > 5) and (conx_course not in course_conx_list):
                    course_conx_list.append(conx_course)
        
        conx_dictionary.update({course_title["name"].encode("utf-8"):course_conx_list})

    with open('course_conx.json', 'w') as outputFile:
        outputFile.write(json.dumps(conx_dictionary))

    json_conx_data.close()



def main():
    
    nodeList = graph()

    connection(nodeList)

if __name__ == '__main__':
    main()